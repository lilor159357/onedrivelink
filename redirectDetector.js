const express = require('express');
const { http, https } = require('follow-redirects');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Endpoint to extract the 1drv.ms URL and follow the redirect to get the download link
app.post('/get-download-link', (req, res) => {
    const { iframeCode } = req.body;

    // Step 1: Extract 1drv.ms URL from iframe code
    const urlMatch = iframeCode.match(/src="(https:\/\/1drv\.ms\/[^"]+)"/);
    if (!urlMatch || !urlMatch[1]) {
        return res.status(400).json({ error: "No valid 1drv.ms URL found in iframe code." });
    }

    const oneDriveShortUrl = urlMatch[1];

    // Step 2: Follow the redirect to get the final download link
    try {
        const url = new URL(oneDriveShortUrl);
        const protocol = url.protocol === 'https:' ? https : http;

        protocol.get(oneDriveShortUrl, (response) => {
            const finalUrl = response.responseUrl || response.headers.location;

            if (!finalUrl) {
                return res.status(400).json({ error: "Redirect failed. No final URL found." });
            }

            const finalUrlObj = new URL(finalUrl);
            const resid = finalUrlObj.searchParams.get("resid");
            const authkey = finalUrlObj.searchParams.get("authkey");

            if (!resid || !authkey) {
                return res.status(400).json({ error: "resid or authkey not found in final URL." });
            }

            // Return a download link instead of embed link
            const downloadLink = `https://onedrive.live.com/download?resid=${resid}&authkey=${authkey}`;
            res.json({ downloadLink });

        }).on('error', (error) => {
            console.error("Redirect error:", error);
            res.status(500).json({ error: "An error occurred while following the redirect." });
        });

    } catch (error) {
        console.error("Error details:", error);
        res.status(500).json({ error: "An error occurred while following the redirect." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
