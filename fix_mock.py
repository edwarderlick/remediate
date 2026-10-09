import re

path = "tests/direct/test_remediate.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
'''    # Mock emit_transfer to fail
    original_emit = contract.emit_transfer
    def mock_emit(*args):
        raise Exception("Transfer failed mock")
    contract.emit_transfer = mock_emit
    
    import pytest
    with pytest.raises(Exception, match="Transfer failed mock"):
        contract.withdraw()
        
    contract.emit_transfer = original_emit''',
'''    # Mock emit_transfer to fail
    import unittest.mock
    
    with unittest.mock.patch("genlayer.get_contract_at") as mock_get_contract_at:
        mock_get_contract_at.return_value.emit_transfer.side_effect = Exception("Transfer failed mock")
        
        import pytest
        with pytest.raises(Exception, match="Transfer failed mock"):
            contract.withdraw()
'''
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
