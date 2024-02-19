const request = require('request');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

//link ="https://www.daviva.lt/en/engines/3039-Complete-Engine.html"
link ='https://www.daviva.lt/en/engines/3430-Bare-Engine.html'




let csvWriter;
csvWriter = createCsvWriter({
    path: 'output.csv',
    header: [],
    append: true,
});

makeRequest(link);

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
                
                // Write records to CSV
                writeCsvRecord(dataSheet)
                    .then(() => {
                        console.log('CSV data appended successfully');
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
    dataSheet.Engin = engin;

    const manufacturerPartNumberDiv = $('section.product-features div.product-features-name:contains("Manufacturer part number")');
    const manufacturerPartNumber = manufacturerPartNumberDiv.next('div.product-features-value').clone().children().remove().end().text().trim();
    dataSheet["Manufacturer Part Number:"] = manufacturerPartNumber;

    // all elements matching the selector
    const nameElements = $('dl.data-sheet dt.name');

    // Iterate over each name element and extract names and values
    nameElements.each((index, element) => {
        const name = $(element).text().trim();
        const value = $(element).next('dd.value').text().trim();
        dataSheet[name] = value;
    });

    console.log(dataSheet);
}



isHeaderWritten=true;

function writeCsvRecord(dataSheet) {
    return new Promise((resolve, reject) => {
        try {
            // If the header is not set, set it
            if (isHeaderWritten) {
                csvWriter = createCsvWriter({
                    path: 'output.csv',
                    header: Object.keys(dataSheet).map(field => ({ id: field, title: field })),
                    append: true, // Overwrite the file for the first link
                });
                isHeaderWritten = false;
            }
            console.log("datasheet",dataSheet)
            csvWriter.writeRecords([dataSheet]).then(resolve).catch(reject); // Append data
            console.log('CSV data appended successfully');
        } catch (error) {
            console.error('Error writing CSV:', error);
            reject(error);
        }
    });
}

