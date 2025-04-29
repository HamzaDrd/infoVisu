# PSA_crime_full.py

import pandas as pd

# Load the data
crime_df = pd.read_csv("crime_clean.csv")

# Preprocessing: fix date columns
crime_df["start_date"] = pd.to_datetime(crime_df["start_date"], errors="coerce")
crime_df["month"] = crime_df["start_date"].dt.month
crime_df["day_of_week"] = crime_df["start_date"].dt.day_name()

# Select the columns that make sense for the PSA chart
columns_to_keep = [
    'psa', 'offense_group', 'offense_text', 'shift', 'method', 'district', 'ward',
    'year', 'month', 'day_of_week', 'latitude', 'longitude'
]

# Filter dataset
psa_data = crime_df[columns_to_keep].dropna(subset=['psa'])

# Save to new CSV
psa_data.to_csv("psa_crime.csv", index=False)

print("✅ PSA detailed crime data saved to 'psa_crime.csv'!")
