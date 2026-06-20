export type ParsedSseEvent = {
  event: string;
  data: string;
};

type SseEventHandler = (event: ParsedSseEvent) => void;

export function createSseParser(onEvent: SseEventHandler) {
  let buffer = '';

  function emit(rawEvent: string) {
    const lines = rawEvent.split('\n');
    let event = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }

    if (dataLines.length === 0) {
      return;
    }

    onEvent({
      event,
      data: dataLines.join('\n'),
    });
  }

  return {
    feed(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n');

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex).trim();
        buffer = buffer.slice(separatorIndex + 2);

        if (rawEvent) {
          emit(rawEvent);
        }

        separatorIndex = buffer.indexOf('\n\n');
      }
    },
    end() {
      const rawEvent = buffer.trim();
      buffer = '';

      if (rawEvent) {
        emit(rawEvent);
      }
    },
  };
}
