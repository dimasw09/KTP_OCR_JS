#server.py
from flask import Flask, render_template, request, jsonify
import uuid
import pika
import os
from ftplib import FTP
from db_connection import create_mongo_connection

app = Flask(__name__)

# RabbitMQ configurations
RABBITMQ_HOST = "localhost"
RABBITMQ_QUEUE = "image_queue"

# FTP configurations
FTP_SERVER = "ftp5.pptik.id"
FTP_PORT = 2121
FTP_USERNAME = "magangitg"
FTP_PASSWORD = "bWFnYW5naXRn"
FTP_UPLOAD_DIR = "/ktp_ocr"

# MongoDB configurations
mongo_collection = create_mongo_connection()


def send_to_queue(filename, receipt):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(RABBITMQ_HOST)
    )
    channel = connection.channel()
    channel.queue_declare(queue=RABBITMQ_QUEUE)
    channel.basic_publish(
        exchange="",
        routing_key=RABBITMQ_QUEUE,
        body=filename,
        properties=pika.BasicProperties(app_id=receipt),
    )
    connection.close()


def upload_to_ftp(file_path, filename):
    try:
        ftp = FTP()
        ftp.connect(FTP_SERVER, FTP_PORT)
        ftp.login(FTP_USERNAME, FTP_PASSWORD)
        ftp.cwd(FTP_UPLOAD_DIR)

        print(f"Uploading {filename} to FTP server.")
        with open(file_path, "rb") as file:
            ftp.storbinary(f"STOR {filename}", file)

        print(f"Upload completed for {filename}.")
        ftp.quit()
    except Exception as e:
        print(f"FTP upload failed: {str(e)}")


def generate_receipt():
    return str(uuid.uuid4())


@app.route("/", methods=["POST"])
def index():
    if request.method == "POST":
        image_file = request.files["image"]
        if image_file:
            try:
                # Generate a unique filename
                file_uuid = str(uuid.uuid4())
                file_extension = os.path.splitext(image_file.filename)[
                    -1
                ].lower()
                new_filename = f"{file_uuid}{file_extension}"

                # Generate receipt
                receipt = generate_receipt()

                # Save the image temporarily
                temp_path = os.path.join("uploads", new_filename)
                image_file.save(temp_path)

                # Upload the file to FTP server
                upload_to_ftp(temp_path, new_filename)

                # Send the file path and receipt to the message queue only if FTP upload is successful
                send_to_queue(temp_path, receipt)

                # Insert receipt into MongoDB
                mongo_collection.insert_one(
                    {"receipt": receipt, "status": "uploaded"}
                )

                return jsonify(
                    {
                        "receipt": receipt,
                        "message": "File uploaded successfully.",
                    }
                )
            except Exception as e:
                error_message = str(e)
                return jsonify({"error": error_message})
        else:
            error_message = "No image uploaded."
            return jsonify({"error": error_message})


# Endpoint to check the status of the uploaded file
@app.route("/check_status", methods=["POST"])
def check_status():
    data = request.get_json()
    receipt = data.get("receipt")

    if receipt:
        # Query MongoDB to check the status
        result = mongo_collection.find_one({"receipt": receipt})
        if result:
            status = result.get("status", "unknown")
            return jsonify({"receipt": receipt, "status": status})
        else:
            return jsonify({"error": "Invalid receipt."})
    else:
        return jsonify({"error": "Receipt not provided."})


if __name__ == "__main__":
    app.run(debug=True)
