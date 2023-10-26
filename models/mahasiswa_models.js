//mahasiswa_models
const mongoose = require('mongoose');
const waktu = require('moment')

const mahasiswaSchema = new mongoose.Schema({
    nama:{
        type: String,
        required:true
    },
    jurusan:{
        type:String,
        required:true
    },
    createAt:{
        type:String,
        default: ()=> waktu().format()
    }

});
module.exports = mongoose.model('MahasiswaModel',mahasiswaSchema)