export async function fetchTopProducts(count = 10) {
    const now = new Date();
    const endOfRange = now.toISOString();
    // Set start of range to 2 days before now to maintain a similar range.
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);
    const startOfRange = twoDaysAgo.toISOString();

    const query = `
        query {
            ai: posts(first: ${count}, order: VOTES, postedAfter: "${startOfRange}", postedBefore: "${endOfRange}", topic: "artificial-intelligence") {
                edges {
                    node {
                        id
                        name
                        tagline
                        description
                        url
                        votesCount
                        thumbnail {
                            url
                        }
                        topics(first: 2) {
                            edges {
                                node {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer BDD6wjaF-GxRlg9IPf-l8q2OLguM0cTa1q9UmBcnMak'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message);

        const topProducts = data.data.ai.edges
            .map(({ node }) => ({
                id: node.id,
                name: node.name,
                tagline: node.tagline,
                description: node.description || 'No description available',
                url: node.url,
                votesCount: node.votesCount,
                thumbnail: node.thumbnail?.url || 'https://via.placeholder.com/80',
                topics: node.topics.edges.map(edge => edge.node.name)
            }))
            .sort((a, b) => b.votesCount - a.votesCount)
            .slice(0, 10);

        console.log('Top AI Software Launches:', topProducts);
        return topProducts;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        return [];
    }
}