const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookeiParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// const corsOptions = {
//   origin: [
//     'http://localhost:5173',
//     'http://localhost:5174',
//     'https://solosphere.web.app',
//   ],
//   credentials: true,
//   optionSuccessStatus: 200,
// }
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookeiParser());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yy4jwyq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// MIDDLEWARE //
const logger = (req, res, next) => {
  console.log("log Info:", req.method, req.url);
  next();
};
const verifyToken = (req, res, next) => {
  const token = req?.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "UnAutgorized Access!" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
    if (err) {
      return res.status(401).send({ message: "'Unautgorized Access!'" });
    }
    req.user = decode;
    next();
  });
  // next();
};
async function run() {
  try {
    const recentBlogCollection = client
      .db("thedailyblog")
      .collection("recentblog");
    const allBlogCollection = client.db("thedailyblog").collection("allblogs");
    const wishlistCollection = client.db("thedailyblog").collection("wishlist");
    const commentCollection = client.db("thedailyblog").collection("comments");

    // JWT IMPLEMENT //
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    app.get("/recentblog", async (req, res) => {
      const result = await recentBlogCollection.find().toArray();
      res.send(result);
    });
    // GET DATA FOR ALL BLOGS //
    // THIS FILTER AND SEARCH FUNCTIONALITY NOT WORKING  BEACUASE THE SAME PATH AND FILTER AFUNCTION  SEARCH //
    app.get("/allblogs", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const query = {
        title: { $regex: search, $options: "i" },
      };
      if (filter) {
        query.category = filter;
      }
      const result = await allBlogCollection.find().toArray();
      res.send(result);
    });
    // GET THE BLOG COMMENT COLLECTION DETAILS //
    app.get("/blogdetails/:blogId", async (req, res) => {
      const id = req.params.blogId;
      const result = await commentCollection.find({ blogId: id }).toArray();
      res.send(result);
    });
    // GET THE BLOG DETAILS //
    app.get("/updateblogpage", async (req, res) => {
      const result = await allBlogCollection.find().toArray();
      res.send(result);
    });
    // GET THE BLOG FOR FEATURE BLOG PAGE //
    app.get("/featureblog", async (req, res) => {
      const result = await allBlogCollection.find().toArray();
      res.send(result);
    });

    // GET DATA FROM WISHLIST //
    app.get(
      "/wishlist/:wishlistuseremail",
      logger,
      verifyToken,
      async (req, res) => {
        const wishlistuseremail = req.params.wishlistuseremail;
        console.log("Owner!", req.user);
        if(req.user.email !== req.query.wishlistuseremail) {
          return res.status(403).send({message: "Forbidden Access!"})
        }
        const query = { wishlistuseremail: wishlistuseremail };
        const result = await wishlistCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.get("/allblogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allBlogCollection.findOne(query);
      res.send(result);
    });

    app.post("/allblogs", async (req, res) => {
      const allBlogData = req.body;
      const result = await allBlogCollection.insertOne(allBlogData);
      res.send(result);
    });
    app.post("/blogdetails", async (req, res) => {
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    });

    app.put("/blogupdated/:id", async (req, res) => {
      const id = req.params.id;
      const updatedId = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateBlog = req.body;
      const updateMyBlog = {
        $set: {
          title: updateBlog.title,
          category: updateBlog.category,
          shortdescription: updateBlog.shortdescription,
          longshortdescription: updateBlog.longshortdescription,
        },
      };
      const result = await allBlogCollection.updateOne(
        updatedId,
        updateMyBlog,
        options
      );
      res.send(result);
    });

    //ADD WISHLIST //

    app.post("/wishlist", async (req, res) => {
      const wishlistData = req.body;
      const result = await wishlistCollection.insertOne(wishlistData);
      res.send(result);
    });

    // WISHLIST REMOVE //
    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from TheDaily Blog Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
