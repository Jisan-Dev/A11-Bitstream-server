const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
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
app.use(cookieParser());

// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: 'Not Authorizedd' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: 'Not Authorized' });
    }
    console.log('values in the token: ', decoded);
    req.decodedUser = decoded;
    next();
  });
};

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

    // generate jwt
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log('first', user);
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '365d' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });

    app.post('/logout', async (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          maxAge: 0,
        })
        .send({ success: true });
    });

    app.get('/blogs', async (req, res) => {
      const cursor = blogsCollection.find({}, { sort: { postedTime: -1 } });
      const blogs = await cursor.toArray();
      res.send(blogs);
    });

    app.get('/recent-blogs', async (req, res) => {
      const cursor = blogsCollection.find({}, { sort: { postedTime: -1 } }).limit(6);
      const blogs = await cursor.toArray();
      res.send(blogs);
    });

    app.get('/blogs/:id', verifyToken, async (req, res) => {
      if (req.query?.email !== req.decodedUser?.email) {
        console.log('dhuikke2', req.query?.email, req.decodedUser?.email);
        return res.status(403).send({ message: 'Forbidden Access' });
      }
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

    app.get('/wishlist', verifyToken, async (req, res) => {
      if (req.query?.email !== req.decodedUser?.email) {
        console.log('dhuikke', req.query?.email, req.decodedUser?.email);
        return res.status(403).send({ message: 'Forbidden Access' });
      }
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
