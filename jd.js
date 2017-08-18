const puppeteer = require('puppeteer');
const fs = require('fs');
const http = require('http');
const url = require('url');
const crypto = require('crypto');

process.on('unhandledRejection', (err) => {
	console.error(err);
	process.exit(1)
});

function envIntDefault (env, def) {
    if (env) {
        return env * 1;
    }
    return def;
}

function normalizeText(text) {
    return text.replace(/\W/g,'');
}

const searchDistro = process.env.DISTRO_BIN || 'linux-x64.tar.gz';
const downloadPageUrl = process.env.DOWNLOAD_PAGE || 'http://www.oracle.com/technetwork/java/javase/downloads/index.html';
const checksumPagePattern = process.env.CHECKSUM_PAGE || 'https://www.oracle.com/webfolder/s/digest/{version}u{build}checksum.html';
const destination = process.env.VOLUME || '/vol';
const majorVersionEquals = envIntDefault(process.env.JAVA_MAJOR_VERSION, 8);
const buildNumberGreaterThan = envIntDefault(process.env.JAVA_BUILD_NUMBER_GT, null);
const termsUrl = 'http://www.oracle.com/technetwork/java/javase/terms/license/index.html';

(async() => {
    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.goto(termsUrl, {waitUntil: 'networkidle'});
    await page.waitForSelector('#Wrapper_FixedWidth_Centercontent');
    const termsText = await page.evaluate(function() {
        return document.querySelector('#Wrapper_FixedWidth_Centercontent').innerText;
    });

    if (!fs.existsSync(`${destination}/terms.txt`) ||
        normalizeText(termsText) !== normalizeText(fs.readFileSync(`${destination}/terms.txt`, { encoding: 'utf-8' }))) {
        console.log(`You must first read and accept the terms and conditions at ${termsUrl}. After doing so, copy and paste the entire text of the license agreement (including the title) into a file named terms.txt in your destination folder.`);
        process.exit(1);
        return;
    }

    await page.goto(downloadPageUrl, {waitUntil: 'networkidle'});
    await page.waitForSelector('table.dataTable tbody tr td h3');
    await page.evaluate(function() {
        const link = Array.from(document.querySelectorAll('table.dataTable tbody tr td h3'))
            .find(n => n.innerText === "JDK").parentNode.querySelector('div a');
        if (!link) {
            throw new Error('Could not locate link on main download page')
        }
        link.click();
    });

	await page.waitForSelector('form.lic_form input');
    const versionArr = await page.evaluate(function() {
		const inputs = Array.from(document.querySelectorAll('form.lic_form input'));
        const agreeRadio = inputs.find(i => {
            return i.attributes['onclick'].value.startsWith('acceptAgreement');
        });
        if (agreeRadio === null) {
            throw new Error('Could not locate agree button');
        }
        agreeRadio.click();
        return agreeRadio.attributes['onclick'].value.split("'").splice(-2)[0].split('-')[1].split('u').map(i => i*1);
    });

    console.log(`Detected version: ${versionArr}`);

    if (majorVersionEquals !== versionArr[0]) {
        throw new Error(`Java major version ${versionArr[0]} was seen on page, expecting ${majorVersionEquals}`);
    }

    if (buildNumberGreaterThan) {
        if (versionArr[1] <= buildNumberGreaterThan) {
            console.info(`Skipping build number ${versionArr[1]}`);
            process.exit(0);
            return;
        }
    }

	page.setRequestInterceptionEnabled(true);

	let req_url = null;
	let headers = null;
	page.on('request', res => {
		const req = res;
		if (req.url.indexOf("AuthParam") !== -1) {
			req_url = req.url;

            headers = Object.create(null);
            for (let [k,v] of req.headers) {
                headers[k] = v;
            }

			req.abort()
		} else {
			req.continue();
		}
	});

	const cookie = await page.evaluate(() => {
		return document.cookie;
	});

	await page.evaluate(function(searchDistro) {
		const anchors = Array.from(document.querySelectorAll('table.downloadBox tbody tr td a'));
        const dlLink = anchors.find(anchor => {
            return anchor.textContent.endsWith(searchDistro);
        });
        dlLink.click()
	}, searchDistro);

    const sigPage = await browser.newPage();

    const checksumPageUrl = checksumPagePattern
        .replace('{version}', versionArr[0])
        .replace('{build}', versionArr[1]);

    await sigPage.goto(checksumPageUrl, { waitUntil: 'networkidle' });
    const versions = await sigPage.evaluate(function() {
        return Array.from(document.querySelector('body table tbody').childNodes)
            .filter(n => n.nodeName === 'TR')
            .map(tr => Array.from(tr.childNodes).filter(n => n.nodeName === 'TD').map(n => n.innerText))
            .map(tr => { return [tr[0], tr[1].split('\n')[0].split(':')[1].trim()] });
    });

    while (req_url === null) {
        await new Promise(resolve => setTimeout(() => resolve(), 200));
    }

    const p_url = url.parse(req_url);

    const filename = p_url.pathname.split('/').slice(-1)[0];

    const versionHash = versions.find(v => v[0] === filename);

    if (!versionHash) {
        throw new Error(`Couldn't find hash data for ${filename}`);
    }

    console.log("Version: " + versionHash);

    console.debug(`Browser closing.\nURL: ${req_url}\nCookie: ${cookie}\nHeaders: ${JSON.stringify(headers)}`);

	browser.close();

	const request = http.get({
		'protocol': p_url.protocol,
		'host': p_url.host,
		'path': p_url.pathname + p_url.search,
		'headers': Object.assign(headers, {
			'Cookie': cookie
		})
	});

	request.addListener('error', err => {
		console.error(err);
	});

	request.addListener('response', function (response) {
        const downloadfile = fs.createWriteStream(`${destination}/${filename}`, {'flags': 'a'});
        const hash = crypto.createHash('sha256');
        console.log(`File ${filename}, size: ${response.headers['content-length']} bytes.`);
		response.addListener('data', function (chunk) {
		    hash.update(chunk);
			downloadfile.write(chunk);
		});
		response.addListener("end", function() {
			downloadfile.end();
			console.log("Finished downloading");
			const downloadedHash = hash.digest('hex');
            console.log(`Downloaded hash: ${downloadedHash}`);
            if (versionHash[1] !== downloadedHash) {
                throw new Error("Validation failed");
            }
		});
	});
})();