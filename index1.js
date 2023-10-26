// index.js
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const MahasiswaModel = require('./models/mahasiswa_models');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.DB_Connect, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(express.json());

// Route to create data     
app.post('/create-mahasiswa', async function (req, res) {
    console.log(req.body);
    const newMahasiswa = new MahasiswaModel({
        nama: req.body.nama,
        jurusan: req.body.jurusan,
    });
    const saveData = await newMahasiswa.save();
    res.send({
        status: true,
        message: 'Data berhasil dibuat',
        data: saveData,
    });
});

// Route to update data
app.get('/update-mahasiswa/:id', async function (req, res) {
    const { id } = req.params;
    const { nama, jurusan } = req.body;

    const updatedData = await MahasiswaModel.findByIdAndUpdate(
        id,
        { nama, jurusan },
        { new: true }
    );

    if (!updatedData) {
        res.send({
            status: false,
            message: 'Data not found',
        });
    } else {
        res.send({
            status: true,
            message: 'Data berhasil diupdate',
            data: updatedData,
        });
    }
});

// Route to delete data
app.delete('/delete-mahasiswa/:id', async function (req, res) {
    const { id } = req.params;

    const deletedData = await MahasiswaModel.findByIdAndDelete(id);

    if (!deletedData) {
        res.send({
            status: false,
            message: 'Data not found',
        });
    } else {
        res.send({
            status: true,
            message: 'Data berhasil dihapus',
            data: deletedData,
        });
    }
});

// Route to search for data
app.get('/cari-mahasiswa', async function (req, res) {
    const { nama } = req.query;
    const dataMahasiswa = await MahasiswaModel.find({
        nama: nama,
    });
    if (dataMahasiswa.length === 0) {
        res.send({
            status: false,
            message: 'Data not found',
        });
    } else {
        res.send({
            status: true,
            message: 'Data berhasil ditemukan',
            data: dataMahasiswa,
        });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
