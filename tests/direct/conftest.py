from pathlib import Path

import pytest
from gltest.direct.loader import deploy_contract


@pytest.fixture
def direct_deploy(direct_vm):
    def deploy(contract_path, *args, **kwargs):
        return deploy_contract(
            Path(contract_path).resolve(),
            direct_vm,
            *args,
            sdk_version="v0.2.16",
            **kwargs,
        )

    return deploy
