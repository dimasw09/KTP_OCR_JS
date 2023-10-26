// fileModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const fileSchema = new Schema({
  id: { type: String, required: true },
  nama_file: { type: String, required: true },
  NIK: { type: String, required: true },
  Nama: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const FileModel = mongoose.model('File', fileSchema);

module.exports = FileModel;
