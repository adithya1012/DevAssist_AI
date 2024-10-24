import { Avatar, Container, Flex } from "@mantine/core";
import { useState } from "react";

const MessageContainer = ({ children, isSystemMessage, ...props }: any) => {

    return (
		<Container p="0" m="0" bg={isSystemMessage ? "var(--mantine-color-dark-6)" : ""} fluid>
			<Flex justify="flex-start" align="center">
				<Avatar variant="transparent" radius="sm" size="md" src={""} color="white" />
				{isSystemMessage ? <span>DevAssist</span> : <span>User</span>}
			</Flex>
			{children}
		</Container>
	);
};

export default MessageContainer;
