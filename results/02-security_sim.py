import matplotlib.pyplot as plt
import pandas as pd
import sys
import os

file_path = '02-security_sim.csv'

if not os.path.exists(file_path):
    print(f"Error: '{file_path}' not found. Please run the security simulation first.")
    sys.exit(1)

try:
    df = pd.read_csv(file_path)
except Exception as e:
    print(f"Error reading CSV: {e}")
    sys.exit(1)

plt.figure(figsize=(10, 7))
plt.grid(True, which="both", ls="--", alpha=0.3, color='gray')

colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']
line_styles = ['-', '--', '-.', ':']
markers = ['o', 's', '^', 'D']

alphas_list = df['FraudRatio(alpha)'].unique()

for i, alpha in enumerate(alphas_list):
    subset = df[df['FraudRatio(alpha)'] == alpha]
    color = colors[i % len(colors)]
    ls = line_styles[i % len(line_styles)]
    mk = markers[i % len(markers)]
    plt.plot(subset['SampleSize(K)'], subset['TheoreticalPd'], 
             linestyle=ls, color=color, linewidth=2.5, alpha=0.9,
             label=fr'Theoretical ($\alpha={alpha}$)')
    plt.scatter(subset['SampleSize(K)'], subset['EmpiricalPd'], 
                color=color, marker=mk, s=80, edgecolors='black', 
                linewidths=1, zorder=5,
                label=fr'Empirical ($\alpha={alpha}$)')

plt.axhline(y=0.99, color='gray', linestyle='--', linewidth=1.5, alpha=0.7)
plt.text(5, 0.995, '99% Confidence Level', fontsize=10, fontweight='bold', color='gray')
plt.xlabel('Sample Size ($K$)', fontsize=12)
plt.ylabel('Detection Probability ($P_d$)', fontsize=12)
plt.title('Security Analysis: Fraud Detection Probability vs. Sample Size', fontsize=14)
plt.ylim(0, 1.05)
plt.legend(loc='lower right', fontsize=10, ncol=2, frameon=True, shadow=True)
plt.tight_layout()
output_fig = '02-security_sim.pdf'
plt.savefig(output_fig, dpi=300)
print(f"Successfully generated: {output_fig}")
plt.show()