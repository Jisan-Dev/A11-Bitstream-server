const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
  optionSuccessStatus: 200,
};

app.get('/', (req, res) => {
  res.send('Hello World! Bitsream is streaming...');
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use(cors(corsOptions));
app.use(express.json());
