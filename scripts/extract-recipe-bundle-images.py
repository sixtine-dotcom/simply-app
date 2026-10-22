"""Extract original PDF JPEGs without resampling or recompression.
Usage: python scripts/extract-recipe-bundle-images.py bundle.pdf output-directory
Requires PyMuPDF. PDF rotation is preserved as EXIF display orientation;
JPEG compressed pixel data remains byte-for-byte unchanged.
"""
import json
import struct
import sys
from pathlib import Path
import pymupdf


def jpeg_orientation(data, orientation):
    # Remove existing EXIF so competing orientation tags cannot override the PDF.
    if data[:2] != b'\xff\xd8':
        raise ValueError('Expected JPEG')
    result = bytearray(data[:2])
    offset = 2
    while offset < len(data):
        marker = data[offset:offset + 2]
        if marker == b'\xff\xda':  # Preserve the entire compressed scan unchanged.
            result.extend(data[offset:])
            break
        if marker[0] != 255:
            raise ValueError('Invalid JPEG marker')
        length = int.from_bytes(data[offset + 2:offset + 4], 'big')
        end = offset + 2 + length
        if not (marker == b'\xff\xe1' and data[offset + 4:offset + 10] == b'Exif\0\0'):
            result.extend(data[offset:end])
        offset = end
    if orientation == 1:
        return bytes(result)
    tiff = b'II' + struct.pack('<HIH', 42, 8, 1)
    tiff += struct.pack('<HHI', 0x112, 3, 1) + struct.pack('<H', orientation) + b'\0\0'
    tiff += struct.pack('<I', 0)
    payload = b'Exif\0\0' + tiff
    return bytes(result[:2]) + b'\xff\xe1' + struct.pack('>H', len(payload) + 2) + payload + bytes(result[2:])


def extract(pdf_path, output):
    pdf = pymupdf.open(pdf_path)
    out = Path(output)
    out.mkdir(parents=True, exist_ok=True)
    items = json.loads((Path(__file__).parent / 'data/recipe-bundle-images.json').read_text())
    manifest = []
    orientations = {(1, 0, 0, 1): 1, (0, 1, -1, 0): 6, (0, -1, 1, 0): 8}
    for item in items:
        page = pdf[item['page'] - 1]
        photos = page.get_image_info(xrefs=True)
        if not photos:
            print(f"No source photo: page {item['page']} ({item['slug']})")
            continue
        photo = max(photos, key=lambda info: pymupdf.Rect(info['bbox']).get_area())
        signs = tuple(0 if abs(v) < .001 else (1 if v > 0 else -1) for v in photo['transform'][:4])
        if signs not in orientations:
            raise ValueError(f"Unsupported photo transform on page {item['page']}")
        original = pdf.extract_image(photo['xref'])
        if original['ext'] != 'jpeg' or original.get('smask', 0):
            raise ValueError(f"Expected unmasked JPEG on page {item['page']}")
        orientation = orientations[signs]
        data = jpeg_orientation(original['image'], orientation)
        (out / (item['slug'] + '.jpg')).write_bytes(data)
        width, height = original['width'], original['height']
        if orientation in (6, 8):
            width, height = height, width
        manifest.append({**item, 'width': width, 'height': height, 'orientation': orientation, 'bytes': len(data)})
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Extracted {len(manifest)} original JPEG photos without recompression')


if __name__ == '__main__':
    extract(sys.argv[1], sys.argv[2])
