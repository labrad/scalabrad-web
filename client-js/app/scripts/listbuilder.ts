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
  public render(listItems: Array, element: HTMLElement, func: Function,
                initialChunkSize?: number, chunkSize?: number) {
    initialChunkSize = (initialChunkSize != undefined) ? initialChunkSize : 20;
    chunkSize = (chunkSize != undefined) ? chunkSize : 200;

    // If we are currently rendering, interrupt all elements currently in the
    // queue and increment the renderId.
    if (this.isRendering) {
      this.renderInterrupt_ = this.renderId_;
      this.renderId_++;
    }

    this.isRendering = true;

    const listLength = listItems.length;
    const chunkCount = Math.ceil((listLength - initialChunkSize) / chunkSize);

    this.chunkListToQueue_(listItems, func, element, 0, 1, initialChunkSize);
    this.chunkListToQueue_(listItems, func, element,
                           initialChunkSize, chunkCount, chunkSize);
    this.emptyChunkQueue_();
  }


  /**
   * Splits a list into chunks and enqueues them to be rendered.
   */
  chunkListToQueue_(list: Array, func: Function, element: HTMLElement,
                    chunkOffset: number, chunkCount: number, chunkSize: number) {
    for (let chunkId = 0; chunkId < chunkCount; ++chunkId) {
      this.chunkQueue_.push({
        renderId: this.renderId_,
        func: () => {
          let length = chunkSize;
          const index = chunkOffset + chunkId * chunkSize;
          if (index + length > list.length) {
            length = list.length - index;
          }

          const docFragment = document.createDocumentFragment();
          for (let i = 0; i < length; ++i) {
            const item = list[index + i];
            docFragment.appendChild(func(item));
          }
          element.appendChild(docFragment);
        }
      });
    }
  }

  /**
   * Takes the chunk from the head of the list and renders it if it has not
   * been interrupted.
   */
  dequeueChunk_() {
    if (this.chunkQueue_.length == 0) {
      return;
    }

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
