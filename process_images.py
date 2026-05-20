import os
from PIL import Image

def process_image(filepath):
    try:
        with Image.open(filepath) as img:
            img = img.convert("RGBA")
            data = img.getdata()
            new_data = []
            
            for item in data:
                # If pixel is near white, make it transparent
                # item is (R, G, B, A)
                if item[0] > 230 and item[1] > 230 and item[2] > 230:
                    new_data.append((255, 255, 255, 0))
                else:
                    new_data.append(item)
                    
            img.putdata(new_data)
            
            # Resize to optimize load times (128x128 is perfect for chess pieces)
            img = img.resize((128, 128), Image.Resampling.LANCZOS)
            
            img.save(filepath, "PNG", optimize=True)
            print(f"Processed: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

skins_dir = os.path.join("public", "skins")

for root, dirs, files in os.walk(skins_dir):
    for file in files:
        if file.endswith(".png"):
            process_image(os.path.join(root, file))
