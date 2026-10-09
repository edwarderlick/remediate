with open('contract/remediate.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
with open('contract/remediate.py', 'w', encoding='utf-8') as f:
    for line in lines:
        if 'print("SENDER:"' in line or 'print("EVALUATE_CONSENSUS CALLED!!!")' in line or 'print("FELL THROUGH")' in line:
            continue
        f.write(line)
