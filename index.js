const request = require('request');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

//link ="https://www.daviva.lt/en/engines/3039-Complete-Engine.html"
//link ='https://www.daviva.lt/en/engines/3430-Bare-Engine.html'




const baseUrl = 'https://www.daviva.lt/en/2-pagrindinis?q=Make-BMW';
links=[]

fetchAllLinks();


// EXTRACT LINK OF PAGINATIONS
async function fetchAllLinks() {
    let nextPageUrl = baseUrl;

    while (nextPageUrl) {
        nextPageUrl = await scrapePageUrl(nextPageUrl);
    }

    console.log('All links:', links.length);

    // fetch the details for each link.
    fetchLinks();

}

async function scrapePageUrl(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, html) => {
            if (error) {
                console.error(`Error fetching ${url}:`, error.message);
                reject(error);
            } else {
                //console.log('statusCode:', response && response.statusCode);
                const $ = cheerio.load(html);

                $('#products .product-image-container a.product-flags-plist').each((index, element) => {
                    const href = $(element).attr('href');
                    links.push(href);
                });

                // Check if there is a next page
                const nextPage = $('.pagination .next');
                if (nextPage.length > 0) {
                    const nextPageUrl = nextPage.attr('href');
                    //console.log('Next page:', nextPageUrl);
                    resolve(nextPageUrl);
                } else {
                    resolve(null);
                }
            }
        });
    });
}



async function fetchLinks() {
    // Create a CSV writer with an empty header initially
    csvWriter = createCsvWriter({
        path: 'BMW.csv',
        header: [],
        append: true,
    });

    for (const link of links) {
        try {
            await makeRequest(link);
        } catch (error) {
            console.error(`Error fetching ${link}:`, error.message);
        }
    }

    console.log('All requests completed.');
}


let csvWriter;


//makeRequest(link);

function makeRequest(link) {
    return new Promise((resolve, reject) => {
        request(link, (error, response, html) => {
            if (error) {
                console.error(`Error fetching ${link}:`, error.message);
                reject(error);
            } else {
                //console.log('statusCode:', response && response.statusCode);

                const dataSheet = {};
                handleHtml(html, dataSheet);
                
                writeCsvRecord(dataSheet)
                    .then(() => {
                        //console.log('CSV data appended successfully');
                        resolve();
                    })
                    .catch(error => {
                        console.error('Error appending CSV data:', error);
                        reject(error);
                    });
            }
        });
    });
}




function handleHtml(html, dataSheet) {
    const $ = cheerio.load(html);

    let engin = $('.product_name').html();
    dataSheet["Part Name"] = engin

    const manufacturerPartNumberDiv = $('section.product-features div.product-features-name:contains("Manufacturer part number")');
    const manufacturerPartNumber = manufacturerPartNumberDiv.next('div.product-features-value').clone().children().remove().end().text().trim();
    dataSheet["Manufacturer Part Number:"] = manufacturerPartNumber;


    const expectedFields = ["Part Name","Manufacturer Part Number:","Year","Make","Model","Fuel type","Body type","kW","HP","Engine capacity"]

    expectedFields.forEach(field => {
        if (!dataSheet[field]) {
            dataSheet[field] = "";
        }
    });

    // all elements matching the selector
    const nameElements = $('dl.data-sheet dt.name');

    // Iterate over each name element and extract names and values
    nameElements.each((index, element) => {
        const name = $(element).text().trim();
        const value = $(element).next('dd.value').text().trim();
        dataSheet[name] = value;
    });

}



isHeaderWritten=true;

function writeCsvRecord(dataSheet) {
    return new Promise((resolve, reject) => {
        try {
            // If the header is not set, set it
            if (isHeaderWritten) {
                csvWriter = createCsvWriter({
                    path: 'BMW.csv',
                    header: Object.keys(dataSheet).map(field => ({ id: field, title: field })),
                    append: true, // Overwrite the file for the first link if false
                });
                isHeaderWritten = false;
            }
            //console.log("datasheet",dataSheet)
            csvWriter.writeRecords([dataSheet]).then(resolve).catch(reject); // Append data
        } catch (error) {
            console.error('Error writing CSV:', error);
            reject(error);
        }
    });
}

