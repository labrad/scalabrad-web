/**
 * Allows for the generation of a large list of DOM nodes by chunking the
 * rendering.
 */
export class ListBuilder {
  /**
   * Whether or not there is current a list rendering.
   */
  public isRendering: boolean = false;


  /**
   * The current renderId of a new render.
   */
  private renderId_: number = 0;


  /**
   * All chunks in the queue with a renderId less than or equal to this number
   * will not fire, and will consider themselves interrupted.
   */
  private renderInterrupt_: number = -1;


  /**
   * The current chunks that are yet to be rendered.
   */
  private chunkQueue_: Array = [];


  /**
   * Renders a list of items, appending them to an element in chunks.
   *
   * Will chunk `listItems` into chunks of size `chunkSize` and then queue them
   * to fire one chunk per animation frame. Each chunk will be evaluated by
   * passing each element in `listItems` to `func` which should return a
   * `HTMLElement`.
   */
  public render(listItems: Array, element: HTMLElement, func: Function, chunkSize?: number) {
    chunkSize = chunkSize || 200;

    // If we are currently rendering, interuppt all elements currently in the
    // queue and increment the renderId.
    if (this.isRendering) {
      this.renderInterrupt_ = renderId;
      this.renderId_++;
    }

    this.isRendering = true;

    const list = listItems;
    const length = list.length;
    const numChunks = Math.ceil(length / chunkSize);

    for (let chunkId = 0; chunkId < numChunks; ++chunkId) {
      const chunkLength = (chunkId == numChunks - 1) ? list.length % chunkSize : chunkSize;

      this.chunkQueue_.push({
        renderId: this.renderId_,
        func: () => {
          const docFragment = document.createDocumentFragment();

          const index = chunkSize * chunkId;
          for (let i = 0; i < chunkLength; ++i) {
            const item = list[index + i];
            docFragment.appendChild(func(item));
          }

          element.appendChild(docFragment);
        }
      });
    }

    // Render the first chunk immediately
    this.dequeueChunk_();
    this.emptyChunkQueue_();
  }


  /**
   * Takes the chunk from the head of the list and renders it if it has not
   * been interrupted.
   */
  dequeueChunk_() {
    const {renderId, func} = this.chunkQueue_.shift();
    if (renderId > this.renderInterrupt_) {
      func();
    }
  }


  /**
   * Continuously dequeues chunks until the queue is empty.
   */
  emptyChunkQueue_() {
    if (this.chunkQueue_.length == 0) {
      this.isRendering = false;
      return;
    }

    requestAnimationFrame(() => {
      this.dequeueChunk_();
      this.emptyChunkQueue_();
    });
  }
}
