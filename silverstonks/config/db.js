const mongoose = require("mongoose");

const connectDB = async () => {
 
  const conn = await mongoose.connect("mongodb+srv://silverstakes:silverstakes@cluster0.cb40d.mongodb.net/silver-stakes-db?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  });

  console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
};

module.exports = connectDB;
