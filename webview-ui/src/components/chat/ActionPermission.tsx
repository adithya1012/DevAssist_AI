import { Button, Flex } from "@mantine/core";
import { useExtension } from "../../context/ExtensionContext";
import { vscode } from "../../utils/vscode";

const ActionPermission = () => {

    const {requestPermission, sendPermissionResponse} = useExtension();

    return (
        <div className="action-permission">
            <div className="action-permission-content">
                <div className="action-permission-icon">
                </div>
                <div className="action-permission-text">
                    <p>{requestPermission.message}</p>
                </div>
            </div>
            <Flex
      mih={50}
      gap="xs"
      justify="flex-end"
      align="center"
      direction="row"
      wrap="wrap"
    >
                <Button onClick={() => {
                   sendPermissionResponse("ACCEPTED")
                }}>Accept</Button>
                <Button onClick={() => {
                   sendPermissionResponse("DENIED")
                }}>Deny</Button>
                </Flex>
        </div>
    )
}

export default ActionPermission;