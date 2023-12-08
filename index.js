const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    // 'http://localhost:5173',
    'https://assignment11-7c14c.web.app',
    'https://assignment11-7c14c.firebaseapp.com'
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())


// middlewares
const verifyToken = (req, res, next) =>{
  const token = req?.cookies?.token;
  if(!token){
      return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
      if(err){
          return res.status(401).send({message: 'unauthorized access'})
      }
      req.user = decoded;
      next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rcyjf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db('toolLander').collection('services')
    const purchasedCollection = client.db('toolLander').collection('purchased')

    // auth related api
    app.post('/jwt',async(req,res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true})
    })

    app.post('/logout', async(req,res) => {
      const user = req.body;
      res.clearCookie('token', {maxAge:0}).send({success:true})
    })

    // services
    app.get('/serviceslimit', async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log(page, size);
      const cursor = serviceCollection.find()
      const result = await cursor.skip(page)
        .limit(size)
        .toArray()
      res.send(result)
    })

    app.get('/emailService', verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = { providerEmail: req.query?.email }
      const result = await serviceCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/servicedetail', verifyToken, async (req, res) => {
      
      const query = { providerEmail: req.query?.email }
      const result = await serviceCollection.find(query).toArray()
      res.send(result)
    })

    app.put('/services/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateService = {
        $set: {
          shortDescription: data.shortDescription,
          area: data.area,
          name: data.name,
          price: data.price,
          image: data.image,
          providerName: data.providerName,
          email: data.email,
        }
      }

      const result = await serviceCollection.updateOne(filter,updateService,options)
      res.send(result)
    })

    app.delete('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.deleteOne(query)
      res.send(result)
    })

    app.get('/filterservice',async(req,res)=>{
      const text = req.query.text.toLowerCase();

      console.log(text);
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      const includeServices= result.filter(serviceName => serviceName.name.toLowerCase().includes(text))
      console.log(includeServices);
      res.send(includeServices)
    })

    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(query)
      res.send(result)
    })

    // purchased services
    app.post('/purchased', async (req, res) => {
      const service = req.body;
      // console.log(service);
      const result = await purchasedCollection.insertOne(service)
      res.send(result)
    })

    app.get('/purchased',verifyToken,async(req,res)=>{
      if (req.user.email !== req.query.email) {
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = { email: req.query.email }
      const result = await purchasedCollection.find(query).toArray()
      res.send(result)
    })

    app.patch('/purchased/:id', async(req,res) =>{
      const id = req.params.id
      const filter = { _id: new ObjectId(id)}
      const updatedStatus = req.body;
      console.log(updatedStatus);
      const updateDoc = {
        $set: {
          status: updatedStatus.status
        }
      }
      const result = await purchasedCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.get('/purchasedown', verifyToken, async(req,res)=>{
      if (req.user.email !== req.query.email) {
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = { providerEmail: req.query.email }
      const result = await purchasedCollection.find(query).toArray()
      res.send(result)
    })

    // add service
    app.post('/services', async (req, res) => {
      const newService = req.body;
      console.log(newService);
      const result = await serviceCollection.insertOne(newService)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Tool Lander is running')
})

app.listen(port, () => {
  console.log(`Tool Lander is running on Port: ${port}`);
})
