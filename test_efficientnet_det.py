"""
Test the mobile-ready TFLite model with post-processing built-in
This model outputs 4 tensors: [boxes, classes, scores, num_detections]
No manual post-processing needed!
"""

import tensorflow as tf
import numpy as np
import cv2
import matplotlib.pyplot as plt


def load_and_preprocess_image(image_path, target_size=(320, 320)):
    """Load and preprocess image for model input"""
    # Read image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    original_image = image.copy()
    
    # Convert BGR to RGB
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Resize to model input size
    image = cv2.resize(image, target_size)
    
    # Normalize to [0, 1]
    image = image.astype(np.float32) / 255.0
    
    # Add batch dimension: [1, 320, 320, 3]
    image = np.expand_dims(image, axis=0)
    
    return image, original_image


def run_inference(model_path, image_path):
    """
    Run inference with mobile-ready TFLite model
    
    Returns:
        boxes: [num_detections, 4] - (x1, y1, x2, y2) coordinates
        classes: [num_detections] - class IDs
        scores: [num_detections] - confidence scores
        num_detections: int - number of valid detections
    """
    
    print(f"\n{'='*70}")
    print(f"TESTING MOBILE-READY TFLITE MODEL")
    print(f"{'='*70}")
    
    # Load TFLite model
    print(f"\nLoading model: {model_path}")
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    
    # Get input/output details
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    print(f"\n✓ Model loaded!")
    print(f"  Input: {input_details[0]['name']} - {input_details[0]['shape']}")
    print(f"  Outputs ({len(output_details)} tensors):")
    for i, detail in enumerate(output_details):
        print(f"    {i}. {detail['name']} - {detail['shape']}")
    
    # Load and preprocess image
    print(f"\nLoading image: {image_path}")
    input_data, original_image = load_and_preprocess_image(image_path)
    print(f"  Input shape: {input_data.shape}")
    print(f"  Original image: {original_image.shape}")
    
    # Run inference
    print(f"\nRunning inference...")
    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()
    
    # Debug: print raw output shapes
    print(f"\nRaw outputs:")
    for i, detail in enumerate(output_details):
        raw_output = interpreter.get_tensor(detail['index'])
        print(f"  Output {i}: {detail['name']} - shape {raw_output.shape}, dtype {raw_output.dtype}")
    
    # Map outputs based on shape:
    # - boxes: [1, 100, 4]
    # - classes: [1, 100]
    # - scores: [1, 100]
    # - num_detections: [1]
    
    output_map = {}
    for i, detail in enumerate(output_details):
        tensor = interpreter.get_tensor(detail['index'])
        shape = tensor.shape
        
        if len(shape) == 3 and shape[2] == 4:  # [1, 100, 4]
            output_map['boxes'] = tensor[0]
        elif len(shape) == 2 and shape[1] == 100:  # [1, 100]
            # Could be classes or scores, use name to distinguish
            if 'PartitionedCall:0' in detail['name'] or i == 3:
                output_map['classes'] = tensor[0]
            else:
                output_map['scores'] = tensor[0]
        elif len(shape) == 1:  # [1]
            output_map['num_detections'] = int(tensor[0])
    
    # Fallback: if we have two [1, 100] tensors, second is scores
    if 'scores' not in output_map:
        for i, detail in enumerate(output_details):
            tensor = interpreter.get_tensor(detail['index'])
            if len(tensor.shape) == 2 and tensor.shape[1] == 100:
                if 'classes' in output_map and np.array_equal(tensor[0], output_map['classes']):
                    continue
                output_map['scores'] = tensor[0]
                break
    
    boxes = output_map['boxes']
    classes = output_map['classes']
    scores = output_map['scores']
    num_detections = output_map['num_detections']
    
    print(f"\n✓ Inference complete!")
    print(f"  Boxes shape: {boxes.shape}")
    print(f"  Classes shape: {classes.shape}")
    print(f"  Scores shape: {scores.shape}")
    print(f"  Number of detections: {num_detections}")
    
    # Debug: print actual values if num_detections is 0
    if num_detections == 0:
        print(f"\n⚠️  Warning: 0 detections found!")
        print(f"  Top 5 scores: {np.sort(scores)[-5:][::-1]}")
        print(f"  Max score: {np.max(scores):.4f}")
        print(f"  This might indicate a problem with the post-processing")
    
    # Filter to actual detections
    boxes = boxes[:num_detections] if num_detections > 0 else boxes
    classes = classes[:num_detections] if num_detections > 0 else classes
    scores = scores[:num_detections] if num_detections > 0 else scores
    
    return boxes, classes, scores, num_detections, original_image


def draw_detections(image, boxes, classes, scores, class_names=None, score_threshold=0.3):
    """Draw bounding boxes on image"""
    
    image = image.copy()
    h, w = image.shape[:2]
    
    print(f"\nDetections (score > {score_threshold}):")
    print(f"{'Class':<25} {'Score':<10} {'Box (x1, y1, x2, y2)'}")
    print(f"{'-'*70}")
    
    valid_count = 0
    for i, (box, cls, score) in enumerate(zip(boxes, classes, scores)):
        if score < score_threshold:
            continue
        
        valid_count += 1
        
        # Get class name
        class_id = int(cls)
        if class_names and class_id < len(class_names):
            class_name = class_names[class_id]
        else:
            class_name = f"Class {class_id}"
        
        # Box coordinates from NMS are in (y1, x1, y2, x2) format in pixel space [0, 320]
        # Need to convert to (x1, y1, x2, y2) and scale to original image size
        y1, x1, y2, x2 = box
        
        # Scale to original image size
        x1 = int(x1 * w / 320)
        y1 = int(y1 * h / 320)
        x2 = int(x2 * w / 320)
        y2 = int(y2 * h / 320)
        
        print(f"{class_name:<25} {score:<10.3f} ({x1}, {y1}, {x2}, {y2})")
        
        # Draw box
        color = (0, 255, 0)  # Green
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
        
        # Draw label
        label = f"{class_name}: {score:.2f}"
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        cv2.rectangle(image, (x1, y1 - label_size[1] - 5), 
                     (x1 + label_size[0], y1), color, -1)
        cv2.putText(image, label, (x1, y1 - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
    
    if valid_count == 0:
        print(f"No detections above threshold {score_threshold}")
    else:
        print(f"\nTotal: {valid_count} detections")
    
    return image


def get_coco_class_names():
    """Return COCO class names"""
    return [
        'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
        'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
        'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
        'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
        'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
        'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
        'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
        'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
        'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
        'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
    ]


def main():
    """Main test function"""
    
    # Paths
    model_path = 'efficientdet_mobile_pytorch.tflite'
    image_path = 'test.jpg'  # Change this to your test image
    
    # Check if files exist
    import os
    if not os.path.exists(model_path):
        print(f"✗ Model not found: {model_path}")
        return
    
    if not os.path.exists(image_path):
        print(f"✗ Test image not found: {image_path}")
        print(f"  Please provide a test image path")
        return
    
    # Run inference
    boxes, classes, scores, num_detections, original_image = run_inference(model_path, image_path)
    
    # Draw results
    class_names = get_coco_class_names()
    result_image = draw_detections(original_image, boxes, classes, scores, 
                                   class_names=class_names, score_threshold=0.3)
    
    # Display results
    print(f"\nDisplaying results...")
    plt.figure(figsize=(12, 8))
    plt.imshow(cv2.cvtColor(result_image, cv2.COLOR_BGR2RGB))
    plt.axis('off')
    plt.title(f'Mobile-Ready TFLite Model - {num_detections} detections')
    plt.tight_layout()
    plt.show()
    
    # Save result
    output_path = 'detection_result_mobile.jpg'
    cv2.imwrite(output_path, result_image)
    print(f"✓ Result saved: {output_path}")
    
    print(f"\n{'='*70}")
    print(f"✓ TEST COMPLETE!")
    print(f"{'='*70}")
    print(f"""
📱 This model is now ready for mobile deployment!

Key features:
- ✓ 4 outputs: boxes, classes, scores, num_detections
- ✓ No post-processing needed on mobile
- ✓ Just load model and run inference
- ✓ Works with TensorFlow Lite Interpreter API

⚠️  Note: Requires TensorFlow Select ops on mobile
   Android: tensorflow-lite-select-tf-ops
   iOS: TensorFlowLiteSelectTfOps
    """)


if __name__ == "__main__":
    main()
