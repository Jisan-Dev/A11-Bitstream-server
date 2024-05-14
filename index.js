const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();

const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.chn7ebi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const blogsCollection = client.db('BitsreamDB').collection('blogs');
    const wishlistCollection = client.db('BitsreamDB').collection('wishlist');
    const commentCollection = client.db('BitsreamDB').collection('comment');

    app.get('/blogs', async (req, res) => {
      const cursor = blogsCollection.find({});
      const blogs = await cursor.toArray();
      res.send(blogs);
    });

    app.get('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const blog = await blogsCollection.findOne({ _id: new ObjectId(id) });
      res.send(blog);
    });

    // get all blogs by filter & search
    app.get('/all-blogs', async (req, res) => {
      const filter = req.query?.filter;
      const search = req.query?.search;

      let query = {
        blog_title: { $regex: search, $options: 'i' },
      };
      if (filter) query.category = filter;
      const blogs = await blogsCollection.find(query).toArray();
      console.log(blogs);
      res.send(blogs);
    });

    app.get('/wishlist', async (req, res) => {
      const email = req.query?.email;
      const blogs = await wishlistCollection.find({ savedEmail: email }).toArray();
      res.send(blogs);
    });

    app.get('/featured', async (req, res) => {
      const options = { sort: { wordCount: -1 } };
      const result = await blogsCollection.find({}, options).toArray();
      res.send(result);
    });

    app.post('/add-blog', async (req, res) => {
      const blogData = req.body;
      const result = await blogsCollection.insertOne(blogData);
      res.send(result);
    });

    app.put('/update-blog/:id', async (req, res) => {
      const id = req.params.id;
      const blogData = req.body;
      const result = await blogsCollection.updateOne({ _id: new ObjectId(id) }, { $set: blogData });
      res.send(result);
    });

    app.post('/add-wishlist', async (req, res) => {
      const blogData = req.body;
      const alreadyExists = await wishlistCollection.findOne({ savedEmail: blogData.savedEmail, mainBlogId: blogData.mainBlogId });
      if (alreadyExists) return res.send({ message: 'Already bookmarked' });

      const result = await wishlistCollection.insertOne(blogData);
      res.send(result);
    });

    app.get('/comments/:id', async (req, res) => {
      const id = req.params.id;
      const comments = await commentCollection.find({ blogId: id }).toArray();
      res.send(comments);
    });

    app.post('/add-comment', async (req, res) => {
      const commentData = req.body;
      const result = await commentCollection.insertOne(commentData);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World! Bitsream is streaming...');
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
