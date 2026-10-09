import os
with open("contract/remediate.py", "r") as f:
    code = f.read()
code = code.replace("print(\"SENDER:\", repr(sender), \"RECIPIENT:\", repr(claim.recipient)); if str(sender).lower() != str(claim.recipient).lower():", "print(\"SENDER:\", repr(sender), \"RECIPIENT:\", repr(claim.recipient))\n        if str(sender).lower() != str(claim.recipient).lower():")
with open("contract/remediate.py", "w") as f:
    f.write(code)
print("Done")
