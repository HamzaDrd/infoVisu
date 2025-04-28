import requests
from bs4 import BeautifulSoup
import time
import json
import re

# ====================================
# SETTINGS
# ====================================

HELLOTICKETS_URL = "https://www.hellotickets.com/us/washington-dc/best-monuments/sc-8-3119"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}
GEOCODE_URL = "https://nominatim.openstreetmap.org/search"

# Correction maps
NAME_CORRECTIONS = {
    "Washington Obelisk": "Washington Monument",
    "Abraham Lincoln Memorial": "Lincoln Memorial",
    "Iwo Jima Memorial": "Marine Corps War Memorial",
    "National World War II Memorial": "World War II Memorial",
    "White House, Capitol, and Supreme Court": "US Capitol",
    "Korean War Veterans Memorial": "Korean War Veterans Memorial Washington DC"
}

HARDCODED_COORDINATES = {
    "Iwo Jima Memorial": (38.8901, -77.0697),
}

# ====================================
# FUNCTIONS
# ====================================

def scrape_monuments():
    """Scrape monument names and image URLs from HelloTickets"""
    response = requests.get(HELLOTICKETS_URL, headers=HEADERS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')

    titles = soup.select(".title-wrapper h2")
    images = soup.select(".post-medium-width-img figure img")

    if len(titles) != len(images):
        print(f"Warning: {len(titles)} titles but {len(images)} images.")

    monuments = []
    for title, img in zip(titles, images):
        raw_name = title.get_text(strip=True)
        img_url = img.get("data-src")
        monuments.append({
            "name": raw_name,
            "image_url": img_url
        })
    return monuments

def geocode_place(place_name):
    """Geocode place using Nominatim API"""
    params = {
        "q": f"{place_name}, Washington DC",
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "MyGeocoderScript/1.0 (your_email@example.com)"
    }
    try:
        response = requests.get(GEOCODE_URL, params=params, headers=headers)
        data = response.json()
        
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
        else:
            return None, None
    except Exception as e:
        print(f"Error geocoding {place_name}: {e}")
        return None, None

def assign_category(name):
    """Assign category based on name keywords"""
    name = name.lower()
    if "memorial" in name:
        return "Memorial"
    elif "museum" in name:
        return "Museum"
    elif "capitol" in name or "white house" in name or "supreme court" in name:
        return "Government"
    elif "park" in name:
        return "Park"
    else:
        return "Monument"


def reverse_geocode(lat, lon):
    """Get address from latitude and longitude using Nominatim API"""
    params = {
        "lat": lat,
        "lon": lon,
        "format": "json",
    }
    headers = {
        "User-Agent": "MyGeocoderScript/1.0 (your_email@example.com)"
    }
    try:
        response = requests.get("https://nominatim.openstreetmap.org/reverse", params=params, headers=headers)
        data = response.json()
        if "display_name" in data:
            return data["display_name"]
        else:
            return "Washington, DC"  # fallback
    except Exception as e:
        print(f"Error reverse geocoding {lat}, {lon}: {e}")
        return "Washington, DC"
    

def clean_address(raw_address):
    """Make the address shorter and cleaner"""
    parts = raw_address.split(", ")
    # Only keep meaningful parts
    filtered_parts = []
    for part in parts:
        if part.isdigit():
            continue  # remove postal codes
        if part in ["District of Columbia", "United States", "Virginia", "Arlington County"]:
            continue  # remove country/state info
        if "Ward" in part:
            continue  # remove ward info
        filtered_parts.append(part)

    # Force appending city/state manually if missing
    if "Washington" in raw_address:
        filtered_parts.append("Washington DC")
    elif "Arlington" in raw_address:
        filtered_parts.append("Arlington VA")

    return ", ".join(filtered_parts)


# ====================================
# MAIN SCRIPT
# ====================================

def main():
    print("Scraping monuments...")
    raw_monuments = scrape_monuments()

    tourist_places = []

    for monument in raw_monuments:
        raw_name = monument["name"]
        # Clean name (remove numbering like "1. Washington Monument")
        clean_name = re.sub(r"^\d+\.\s*", "", raw_name)

        # Special case: hardcoded coordinates
        if clean_name in HARDCODED_COORDINATES:
            lat, lon = HARDCODED_COORDINATES[clean_name]
            print(f"Using hardcoded coordinates for {clean_name}")
        else:
            corrected_name = NAME_CORRECTIONS.get(clean_name, clean_name)
            print(f"Geocoding {corrected_name}...")
            lat, lon = geocode_place(corrected_name)
            time.sleep(1)  # Respect OpenStreetMap Nominatim rate limit

        tourist_places.append({
            "name": clean_name,
            "address": clean_address(reverse_geocode(lat, lon)),
            "latitude": lat,
            "longitude": lon,
            "category": assign_category(clean_name),
            "image_url": monument["image_url"]
        })

    # Save the final tourist.json
    with open("tourist.json", "w", encoding="utf-8") as f:
        json.dump(tourist_places, f, indent=4, ensure_ascii=False)

    print(f"Done! {len(tourist_places)} monuments saved into 'tourist.json'.")

# ====================================
# RUN
# ====================================

if __name__ == "__main__":
    main()
