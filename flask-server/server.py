from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import io
from PIL import Image
import mediapipe as mp

app = Flask(__name__)
CORS(app)

mp_pose = mp.solutions.pose

def normalize_coordinates(coordinates):
    if not coordinates:
        return coordinates

    x_coords = [coord[0] for coord in coordinates]
    y_coords = [coord[1] for coord in coordinates]
    z_coords = [coord[2] if len(coord) > 2 else 0 for coord in coordinates]  # Handle z if present

    min_x, max_x = min(x_coords), max(x_coords)
    min_y, max_y = min(y_coords), max(y_coords)
    min_z, max_z = min(z_coords), max(z_coords)

    normalized_coords = [
        [
            (x - min_x) / (max_x - min_x) if max_x != min_x else 0.5,
            (y - min_y) / (max_y - min_y) if max_y != min_y else 0.5,
            (z - min_z) / (max_z - min_z) if max_z != min_z else 0.5
        ]
        for x, y, z in zip(x_coords, y_coords, z_coords)
    ]
    return normalized_coords

def extract_video_coordinates(image_data):
    img_bytes = base64.b64decode(image_data.split(',')[1])
    img = Image.open(io.BytesIO(img_bytes))
    img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        results = pose.process(img)

    video_coordinates = []
    if results.pose_landmarks:
        video_coordinates = [[landmark.x, landmark.y, landmark.z] for landmark in results.pose_landmarks.landmark]

    return video_coordinates

def calculate_similarity(human_coords, model_coords, threshold=25):
    filtered_human_coords = [human_coords[i] for i in range(len(human_coords)) if i not in [1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 27, 28]]
    filtered_model_coords = [model_coords[i] for i in range(len(model_coords)) if i not in [0, 1, 2, 4, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 60, 62, 63]]
    
    len_human = len(filtered_human_coords)
    len_model = len(filtered_model_coords)

    if len_human < len_model:
        filtered_human_coords.extend([None] * (len_model - len_human))
    elif len_model < len_human:
        filtered_model_coords.extend([None] * (len_human - len_model))

    count_exceeding_threshold = 0
    total_points = len(filtered_human_coords)
    correspondences = [(0, 16), (1, 19), (2, 17), (3, 13), (4, 15), (5, 5), (6, 9), (7, 4), (8, 14), (9, 10), (10, 8), (11, 1), (12, 6), (13, 0), (14, 7), (15, 2), (16, 3), (17, 12), (18, 18), (19, 11)]
    for i in range(len(correspondences)):
        if filtered_human_coords[i] is not None and filtered_model_coords[i] is not None:
            x = correspondences[i][0]
            y = correspondences[i][1]
            distance = ((filtered_human_coords[x][0] - filtered_model_coords[y][0])**2+ (filtered_human_coords[x][1] - filtered_model_coords[y][1])**2+(filtered_human_coords[x][2] - filtered_model_coords[y][2])**2)**0.5 
            if distance < 0.4:
                count_exceeding_threshold += 1

    ratio_exceeding_threshold = (count_exceeding_threshold / total_points) 
    return ratio_exceeding_threshold

@app.route('/coordinates', methods=['POST'])
def receive_coordinates():
    print("Received POST request")
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data received"}), 400

    image_data = data.get('image', '')
    model_coordinates = data.get('modelCoordinates', [])

    if not image_data or not model_coordinates:
        return jsonify({"error": "Missing data in request"}), 400

    print("Image data and model coordinates received")
    
    video_coordinates = extract_video_coordinates(image_data)
    
    normalized_video_coords = normalize_coordinates(video_coordinates)
    normalized_model_coords = normalize_coordinates(model_coordinates)

    similarity_percentage = calculate_similarity(normalized_video_coords, normalized_model_coords) * 100
    print("video_coordinates:",normalized_video_coords)
    print("model_coordinates:",normalized_model_coords)
    print("similarity:",similarity_percentage)
    return jsonify({
        'filtered_model_coordinates': normalized_model_coords,
        'filtered_video_coordinates': normalized_video_coords,
        'similarity': similarity_percentage,
    })

if __name__ == '__main__':
    app.run(debug=True)
