import { Avatar, Container, Flex } from "@mantine/core";

const MessageContainer = ({ children, isSystemMessage, ...props }: any) => {
	return (
		<Container p="0" m="0">
			<Flex justify="flex-start" align="center">
				<Avatar variant="transparent" radius="sm" size="md" src="" />
				{isSystemMessage ? <span>DevAssist</span> : <span>User</span>}
			</Flex>
			{children}
		</Container>
	);
};

export default MessageContainer;
