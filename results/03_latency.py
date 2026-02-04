import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import os
import sys

file_path = '03_latency.csv'

if not os.path.exists(file_path):
    print(f"Error: '{file_path}' not found. Please run the latency experiment first.")
    sys.exit(1)

df = pd.read_csv(file_path)
n_labels = [f"$10^{int(np.log10(n))}$" for n in df['N']]
comm = df['Comm_Avg']
chal = df['Chal_Avg']
prov = df['Prov_Avg']
settle = df['Settle_Avg']
chal_std = df['Chal_Std']
prov_std = df['Prov_Std']
settle_std = df['Settle_Std']

plt.figure(figsize=(10, 6))
plt.grid(axis='y', linestyle='--', alpha=0.3, zorder=0)

colors = ['#aec7e8', '#ffbb78', '#98df8a', '#ff9896']
hatches = ['', '//', '\\', 'xx']
labels = ['Registration (Comm)', 'Challenge', 'Proving', 'Settlement']

x = np.arange(len(n_labels))
width = 0.5

plt.bar(x, comm, width, label=labels[0], color=colors[0], 
        edgecolor='black', hatch=hatches[0], zorder=3)
plt.bar(x, chal, width, bottom=comm, label=labels[1], color=colors[1], 
        edgecolor='black', hatch=hatches[1], yerr=chal_std, capsize=5, zorder=3)
plt.bar(x, prov, width, bottom=comm+chal, label=labels[2], color=colors[2], 
        edgecolor='black', hatch=hatches[2], yerr=prov_std, capsize=5, zorder=3)
plt.bar(x, settle, width, bottom=comm+chal+prov, label=labels[3], color=colors[3], 
        edgecolor='black', hatch=hatches[3], yerr=settle_std, capsize=5, zorder=3)
plt.xlabel('Dataset Size ($N$)', fontsize=12)
plt.ylabel('Latency (seconds)', fontsize=12)
plt.title('End-to-End Latency Breakdown of Block-Sampling Protocol', fontsize=14)
plt.xticks(x, n_labels)
plt.legend(loc='upper left', frameon=True, shadow=True)
plt.tight_layout()
output_fig = '03-latency.pdf'
plt.savefig(output_fig, dpi=300)
print(f"Successfully generated: {output_fig}")
plt.show()