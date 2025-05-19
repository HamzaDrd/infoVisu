import os
import pandas as pd

# Set working directory to the script's location
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Load the data
df = pd.read_csv("crime_clean.csv")

# Preprocessing: fix date columns
df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')

# Drop rows where 'start_date' or required columns are missing
df_clean = df.dropna(subset=['start_date', 'offense_group', 'method', 'shift', 'district', 'ward']).copy()

# Extract just the date (no time component)
df_clean['date'] = df_clean['start_date']

df_clean['year'] = df_clean['date'].dt.year
df_clean['month'] = df_clean['date'].dt.month
df_clean['day_of_week'] = df_clean['date'].dt.day_name()

# Group by date and additional attributes, count number of crimes
daily_crime_counts = (
    df_clean
    .groupby(['date', 'year', 'month', 'day_of_week', 'offense', 'offense_group', 'offensekey', 'method', 'shift', 'district', 'ward'])
    .size()
    .reset_index(name='count')
)

# Save to CSV file
daily_crime_counts.to_csv("crime_daily_counts.csv", index=False)

print("✅ crime data counts saved to 'crime_daily_counts.csv'!")