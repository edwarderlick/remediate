import os
with open("contract/remediate.py", "r") as f:
    code = f.read()
code = code.replace("try:\\n    BaseContract = gl.Contract\\nexcept AttributeError:\\n    BaseContract = gl.contract.Contract\\nclass RemediateContract(BaseContract):", 
"""try:
    BaseContract = gl.Contract
except AttributeError:
    BaseContract = gl.contract.Contract
class RemediateContract(BaseContract):""")
with open("contract/remediate.py", "w") as f:
    f.write(code)
print("Done")
