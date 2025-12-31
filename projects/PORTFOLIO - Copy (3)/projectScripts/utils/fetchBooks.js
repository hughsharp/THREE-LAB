// countryBooks.js
// Mashup: REST Countries + Open Library
// Exportable function to fetch country info + related books

// Main function
async function getCountryAndBooks(countryName) {
    try {
        // 1. Fetch country data from REST Countries
        const countryRes = await fetch(`https://restcountries.com/v3.1/name/${countryName}`);
        const countryData = await countryRes.json();
        const country = countryData[0];

        // Prepare country info
        const countryInfo = {
            name: country.name.common,
            region: country.region,
            population: country.population,
            languages: Object.values(country.languages).join(", "),
        };

        // 2. Fetch books from Open Library related to the country
        const booksRes = await fetch(`https://openlibrary.org/search.json?q=${countryName}`);
        const booksData = await booksRes.json();

        // Prepare top 5 books
        const topBooks = booksData.docs.slice(0, 5).map((book, i) => ({
            rank: i + 1,
            title: book.title,
            authors: book.author_name ? book.author_name.join(", ") : "Unknown",
            year: book.first_publish_year || "N/A",
        }));

        // Return combined result
        return {
            country: countryInfo,
            books: topBooks,
        };

    } catch (err) {
        console.error("Error fetching data:", err);
        throw err;
    }
}

// Export the function
export { getCountryAndBooks };

// Example usage (uncomment to test):
// getCountryAndBooks("France").then(result => console.log(result));
