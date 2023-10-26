//server.js
const express = require('express');
const multer = require('multer');
const uuid = require('uuid');
const amqp = require('amqplib');
const fs = require('fs');
const ftp = require('basic-ftp');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const port = 3000;

// RabbitMQ configurations
const RABBITMQ_HOST = 'localhost';
const RABBITMQ_QUEUE = 'image_queue';

// FTP configurations
const FTP_SERVER = 'ftp5.pptik.id';
const FTP_PORT = 2121;
const FTP_USERNAME = 'magangitg';
const FTP_PASSWORD = 'bWFnYW5naXRn';
const FTP_UPLOAD_DIR = '/ktp_ocr';

// MongoDB configurations
const mongo_url = 'mongodb://magangitg:bWFnYW5naXRn@database2.pptik.id:27017/magangitg';
const mongo_db = 'magangitg';
const mongo_collection_name = 'ktp_ocr';

let mongo_collection;

async function createMongoConnection() {
  const client = await MongoClient.connect(mongo_url, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = client.db(mongo_db);
  mongo_collection = db.collection(mongo_collection_name);
}

createMongoConnection();  

// Koneksi ke RMQ
async function sendToQueue(filename, receipt) {
    const connection = await amqp.connect(`amqp://${RABBITMQ_HOST}`);
    const channel = await connection.createChannel();
  
    try {
      await channel.assertQueue(RABBITMQ_QUEUE, { durable: false });
    } catch (error) {
      if (error.code !== 406) {
        throw error;
      }
    }
  
    channel.sendToQueue(RABBITMQ_QUEUE, Buffer.from(filename), {
      appId: receipt,
    });
  
    await channel.close();
    await connection.close();
  }  

// FTP upload setup
async function uploadToFTP(file_path, filename) {
  const client = new ftp.Client();
  try {
    await client.access({
      host: FTP_SERVER,
      port: FTP_PORT,
      user: FTP_USERNAME,
      password: FTP_PASSWORD,
    });

    console.log(`Uploading ${filename} to FTP server.`);
    await client.uploadFrom(fs.createReadStream(file_path), `${FTP_UPLOAD_DIR}/${filename}`);
    console.log(`Upload completed for ${filename}.`);
  } catch (error) {
    console.error(`FTP upload failed: ${error.message}`);
  } finally {
    client.close();
  }
}

// Express setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/', upload.single('image'), async (req, res) => {
  try {
    const image_file = req.file;
    if (image_file) {
      const file_uuid = uuid.v4();
    //   const file_extension = image_file.originalname.toLowerCase();
      const new_filename = `${file_uuid}.png`;

      const receipt = new_filename;

      const temp_path = `uploads/${new_filename}`;
      fs.writeFileSync(temp_path, image_file.buffer);

      await uploadToFTP(temp_path, new_filename);
      await sendToQueue(temp_path, receipt);

      await mongo_collection.insertOne({ receipt: receipt, status: 'uploaded' });

      res.json({
        receipt: receipt,
        message: 'File uploaded successfully.',
      });
    } else {
      const error_message = 'No image uploaded.';
      res.json({ error: error_message });
    }
  } catch (error) {
    const error_message = error.message || 'An error occurred.';
    res.json({ error: error_message });
  }
});

// Add the following code in the server.js file, after the existing /check_status endpoint

app.get('/check_status/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      const result = await mongo_collection.findOne({ nama_file: filename });
  
      if (result) {
        const receipt = result.receipt || 'unknown';
        const status = result.status || 'unknown';
        res.json({ receipt, status, filename });
      } else {
        res.json({ error: 'File not found in the database.' });
      }
    } catch (error) {
      res.json({ error: `An error occurred: ${error.message || 'unknown'}` });
    }
  });
  

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
