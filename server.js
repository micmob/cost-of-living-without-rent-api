const express = require('express');

const app = express();

const cheerio = require('cheerio');
const fetch = require('node-fetch');

// GET /costs?city={city}
// GET /costs?country={country}

app.get('/costs', async (req, res) => {
    const city = req.query.city;
    const country = req.query.country;

    if (
        (city === undefined && country === undefined) ||
        (city !== undefined && city.toString().includes(',')) ||
        (country !== undefined && country.toString().includes(','))
    ) {
        return res.status(400).json({
            error: 'Please provide a valid location. Hint: /costs/country=Switzerland or /costs/city=London'
        });
    }

    var location;

    if (city !== undefined) {
        location = city;
    } else {
        location = country;
    }

    location = location[0].toUpperCase() + location.slice(1).toLowerCase();

    var URL;

    if (city) {
        URL = `https://www.numbeo.com/cost-of-living/in/${location}?displayCurrency=USD`;
    } else {
        URL = `https://www.numbeo.com/cost-of-living/country_result.jsp?country=${location}&displayCurrency=USD`;
    }

    const response = await fetch(URL);
    if (response.ok) {
        try {
            const html = await response.text();
            const $ = cheerio.load(html);

            if ($('.summary').html() === null) {
                return res.status(400).json({
                    error: 'Please provide a valid location. Hint: /country=Switzerland or /city=London. If there is no error in your code, Numbeo (https://www.numbeo.com) might be unavailable.'
                });
            }

            const statistics = $('.summary')
                .toArray()
                .map(function (x) {
                    return $(x)
                        .find('ul')
                        .children()
                        .toArray()
                        .map(function (x) {
                            return $(x).text();
                        });
                });

            const costs = [];
            statistics[0].slice(0, 2).forEach(stat => {
                const cost = stat
                    .toString()
                    .split(' ')
                    .find(elem => elem.includes('$'));
                costs.push(
                    parseFloat(cost.substr(0, cost.length - 2).replace(',', ''))
                );
            });

            return res.status(200).json({
                costs: { familyOfFour: costs[0], singlePerson: costs[1] }
            });
        } catch (err) {
            return res.status(400).json({ error: 'Something went wrong.' });
        }
    }

    return res
        .status(400)
        .json({ error: 'Numbeo cannot process this location.' });
});

app.get('*', (req, res) => {
    res.status(400).json({
        error: 'Please provide a location.'
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
