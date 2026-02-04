import matplotlib.pyplot as plt
import pandas as pd
import sys
import os

file_path = '01-efficiency_log.csv'

if not os.path.exists(file_path):
    print(f"Error: '{file_path}' not found in the current directory.")
    print("Please ensure the CSV file exists before running this script.")
    sys.exit(1)

try:
    df = pd.read_csv(file_path)
    print("Successfully loaded experimental data:")
    print(df.head())
except Exception as e:
    print(f"Error reading CSV file: {e}")
    sys.exit(1)

plt.figure(figsize=(10, 6))
plt.grid(True, which="both", ls="-", alpha=0.5)

plt.plot(df['N'], df['FullZKTotal(s)'], marker='o', linestyle='--', color='red', 
         label=r'Full-scale ZKP (Estimated $O(N)$)')

plt.plot(df['N'], df['BlockSamplingTotal(s)'], marker='s', linestyle='-', color='blue', 
         label=r'Proposed Block-Sampling ($O(K \log N)$)')

plt.xscale('log')
plt.yscale('log')
plt.xlabel('Dataset Size ($N$)', fontsize=12)
plt.ylabel('Total Proving Time (seconds)', fontsize=12)
plt.title('Proof Generation Efficiency: Full-scale ZKP vs. Block-Sampling', fontsize=14)

for i in range(len(df)):
    speedup_val = df['Speedup'].iloc[i]
    plt.annotate(f"{speedup_val:.1f}x", 
                 (df['N'].iloc[i], df['BlockSamplingTotal(s)'].iloc[i]), 
                 textcoords="offset points", 
                 xytext=(0, 12), 
                 ha='center', 
                 fontsize=10, 
                 color='blue', 
                 fontweight='bold')

plt.legend(loc='upper left', fontsize=11)
plt.tight_layout()

output_fig = '01-efficiency_comparison.pdf'
plt.savefig(output_fig)
print(f"Successfully generated plot: {output_fig}")
plt.show()