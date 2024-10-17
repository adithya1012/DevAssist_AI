# Deployment of ollama

## Possible Models Options

| API Provider | Model             | Source |                                                   |
| ------------ | ----------------- | ------ | ------------------------------------------------- |
| Ollama       | llama 3.1         | Open   | [🔗](https://ollama.com/library/llama3.1)          |
| Ollama       | qwen 2.5 coder    | Open   | [🔗](https://ollama.com/library/qwen2.5-coder)     |
| Ollama       | deepseek coder v2 | Open   | [🔗](https://ollama.com/library/deepseek-coder-v2) |
| Ollama       | codellama         | Open   | [🔗](https://ollama.com/library/codellama)         |
| OpenAI       | gpt-4o            | Close  | [🔗](https://openai.com/api/pricing/)              |
| OpenAI       | gpt-o1            | Close  | [🔗](https://openai.com/api/pricing/)              |

## Docker Setup

Build the docker image with the given model

```bash
docker build --build-arg model_name=<model_name> -t <tag_name> .
```

Running the built docker image

```bash
docker run <tag_name>
```

## Hosting on GCP

> ToDo
