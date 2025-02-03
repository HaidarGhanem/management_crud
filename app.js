const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const ITEMS_FILE = path.join(__dirname, 'items.json');
const TRANSACTIONS_FILE = path.join(__dirname, 'transactions.json');
const DIST_FOLDER = path.join(__dirname, 'dist'); // Path to the dist folder

// Initialize JSON files if they don't exist
async function initializeFiles() {
    try {
        await fs.access(ITEMS_FILE);
    } catch {
        await fs.writeFile(ITEMS_FILE, '[]');
    }

    try {
        await fs.access(TRANSACTIONS_FILE);
    } catch {
        await fs.writeFile(TRANSACTIONS_FILE, '[]');
    }
}

// Serve static files from the dist directory
app.use(express.static(DIST_FOLDER));

// API endpoints
app.get('/items', async (req, res) => {
    try {
        const data = await fs.readFile(ITEMS_FILE);
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Error reading items' });
    }
});

app.post('/items', async (req, res) => {
    try {
        const items = JSON.parse(await fs.readFile(ITEMS_FILE));
        const newItem = {
            id: Date.now(),
            name: req.body.name,
            amount: req.body.amount
        };
        items.push(newItem);
        await fs.writeFile(ITEMS_FILE, JSON.stringify(items, null, 2));
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Error creating item' });
    }
});

app.put('/items/:name', async (req, res) => {
    try {
        const items = JSON.parse(await fs.readFile(ITEMS_FILE));
        const index = items.findIndex(item => item.name === req.params.name);
        
        if (index === -1) return res.status(404).json({ error: 'Item not found' });
        
        items[index] = { ...items[index], ...req.body };
        await fs.writeFile(ITEMS_FILE, JSON.stringify(items, null, 2));
        res.json(items[index]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating item' });
    }
});

app.delete('/items/:name', async (req, res) => {
    try {
        let items = JSON.parse(await fs.readFile(ITEMS_FILE));
        items = items.filter(item => item.name !== req.params.name);
        await fs.writeFile(ITEMS_FILE, JSON.stringify(items, null, 2));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error deleting item' });
    }
});

// Transaction endpoint
app.post('/take-item', async (req, res) => {
    try {
        let { personName, itemName, amount } = req.body;
        if (!itemName || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!personName) {
            personName = "System";
        }
        
        const items = JSON.parse(await fs.readFile(ITEMS_FILE));
        const itemIndex = items.findIndex(item => item.name === itemName);
        
        if (itemIndex === -1) return res.status(404).json({ error: 'Item not found' });
        if (items[itemIndex].amount < amount) {
            return res.status(400).json({ error: 'Insufficient amount' });
        }

        items[itemIndex].amount -= amount;
        await fs.writeFile(ITEMS_FILE, JSON.stringify(items, null, 2));

        // Record transaction
        const transactions = JSON.parse(await fs.readFile(TRANSACTIONS_FILE));
        transactions.push({
            personName,
            itemName,
            amount,
            timestamp: new Date().toISOString()
        });
        await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));

        res.json({ 
            message: `${personName} took ${amount} ${items[itemIndex].name}(s)`,
            remaining: items[itemIndex].amount 
        });
    } catch (error) {
        res.status(500).json({ error: `Error processing transaction ${error.message}` });
    }
});

app.get('/transactions', async (req, res) => {
    try {
        const data = await fs.readFile(TRANSACTIONS_FILE);
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Error reading transactions' });
    }
});

// Serve the React app on the base route
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_FOLDER, 'index.html'));
});

const PORT = 3000;
initializeFiles().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});