import json


class FakeToolCallFunction:
    def __init__(self, name: str, arguments: dict):
        self.name = name
        self.arguments = json.dumps(arguments)


class FakeToolCall:
    def __init__(self, call_id: str, name: str, arguments: dict):
        self.id = call_id
        self.function = FakeToolCallFunction(name, arguments)

    def model_dump(self) -> dict:
        return {
            "id": self.id,
            "type": "function",
            "function": {"name": self.function.name, "arguments": self.function.arguments},
        }


class FakeMessage:
    def __init__(self, content: str | None = None, tool_calls: list | None = None):
        self.content = content
        self.tool_calls = tool_calls


class FakeOpenAIClient:
    def __init__(self, responses: list[FakeMessage]):
        self._responses = list(responses)

    def chat(self, messages: list[dict]) -> FakeMessage:
        return self._responses.pop(0)
