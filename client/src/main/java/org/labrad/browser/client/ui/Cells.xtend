package org.labrad.browser.client.ui

import static com.google.gwt.dom.client.BrowserEvents.CLICK
import java.util.Set
import com.google.gwt.cell.client.ImageResourceCell
import com.google.gwt.cell.client.ValueUpdater
import com.google.gwt.dom.client.BrowserEvents
import com.google.gwt.dom.client.Element
import com.google.gwt.dom.client.NativeEvent
import com.google.gwt.resources.client.ImageResource
import com.google.gwt.user.cellview.client.Column
import com.google.gwt.user.cellview.client.TextColumn
import com.google.gwt.cell.client.AbstractCell
import com.google.gwt.safehtml.client.SafeHtmlTemplates
import com.google.gwt.safehtml.shared.SafeHtml
import com.google.gwt.safehtml.shared.SafeUri
import com.google.gwt.safehtml.shared.SafeHtmlBuilder
import com.google.gwt.safehtml.shared.SafeHtmlUtils
import com.google.gwt.safehtml.shared.UriUtils
import com.google.gwt.core.client.GWT
import com.google.gwt.cell.client.Cell
import com.google.gwt.cell.client.IconCellDecorator
import com.google.gwt.safecss.shared.SafeStylesBuilder
import com.google.gwt.user.client.ui.AbstractImagePrototype
import com.google.gwt.safecss.shared.SafeStyles
import org.labrad.browser.client.BrowserImages
import com.google.gwt.dom.client.DataTransfer

class ImageButtonCell extends ImageResourceCell {
  override Set<String> getConsumedEvents() {
    #{BrowserEvents.CLICK, BrowserEvents.KEYDOWN}
  }

  override void onBrowserEvent(Context context, Element parent, ImageResource value, NativeEvent event,
    ValueUpdater<ImageResource> valueUpdater) {
    super.onBrowserEvent(context, parent, value, event, valueUpdater)
    if (CLICK == event.type) {
      val eventTarget = event.eventTarget
      if (!Element.is(eventTarget)) {
        return
      }
      if (parent.firstChildElement.isOrHasChild(Element.^as(eventTarget))) {
        // Ignore clicks that occur outside of the main element.
        onEnterKeyDown(context, parent, value, event, valueUpdater)
      }
    }
  }

  override protected void onEnterKeyDown(Context context, Element parent, ImageResource value,
    NativeEvent event, ValueUpdater<ImageResource> valueUpdater) {
    if (valueUpdater != null) {
      valueUpdater.update(value)
    }
  }
}

class ImageButtonColumn<T> extends Column<T, ImageResource> {
  private ImageResource image

  new(ImageResource image) {
    super(new ImageButtonCell)
    this.image = image
  }

  override ImageResource getValue(T t) {
    image
  }
}

/**
 * A decorator that adds an icon to a cell,
 * with the icon computed based on the cell value.
 */
class VariableIconCellDecorator<C> extends IconCellDecorator<C> {

  interface Template extends SafeHtmlTemplates {
    /**
     * The wrapper around the image vertically aligned to the middle.
     */
    @Template('<div style="{0}position:absolute;top:50%;line-height:0px;">{1}</div>')
    def SafeHtml imageWrapperMiddle(SafeStyles styles, SafeHtml image)
  }

  private static val template = GWT::create(Template) as Template
  private static val images = GWT::create(BrowserImages) as BrowserImages

  private val (C)=>ImageResource iconFunc

  new(Cell<C> cell, (C)=>ImageResource iconFunc) {
    super(images.key, cell) // ugh; superclass needs an images here, even though we don't actually use it
    this.iconFunc = iconFunc
  }

  override protected SafeHtml getIconHtml(C value) {
    val icon = iconFunc.apply(value)

    // This code is based on IconCellDecorator.getImageHtml.
    // We cannot just call that because it's package private.

    // Get the HTML for the image.
    val proto = AbstractImagePrototype.create(icon)
    val image = SafeHtmlUtils.fromTrustedString(proto.getHTML)

    // Create the wrapper based on middle vertical alignment.
    val cssStyles = new SafeStylesBuilder().appendTrustedString("left:0px;")
    val halfHeight = Math.round(icon.height / 2.0) as int
    cssStyles.appendTrustedString("margin-top:-" + halfHeight + "px;")

    template.imageWrapperMiddle(cssStyles.toSafeStyles, image)
  }
}

class MaybeLink {
  boolean link
  String label
  String url

  new(String label, String url, boolean link) {
    this.label = label
    this.url = url
    this.link = link
  }
  def boolean isLink() { link }
  def String getLabel() { label }
  def String getUrl() { url }
}

class MaybeLinkCell extends AbstractCell<MaybeLink> {
  static interface Templates extends SafeHtmlTemplates{
    @Template('<a href="{0}">{1}</a>')
    def SafeHtml link(SafeUri link, SafeHtml label)

    @Template('<span>{0}</span>')
    def SafeHtml label(SafeHtml label)
  }

  static val templates = GWT::create(Templates) as Templates

  new() {
    super(#[])
  }

  override def void render(Context context, MaybeLink value, SafeHtmlBuilder sb) {
    if (value == null) {
      return
    }
    val label = SafeHtmlUtils::fromString(value.label)
    if (value.isLink) {
      val safeUri = UriUtils::fromString(value.url)
      sb.append(templates.link(safeUri, label))
    } else {
      sb.append(templates.label(label))
    }
  }
}

class Cells {
  public static def <T, C> Column<T, C> toColumn(Cell<C> cell, (T)=>C valueFunc) {
    new Column<T, C>(cell) {
      override C getValue(T t) {
        valueFunc.apply(t)
      }
    }
  }

  public static def <C> Cell<C> decorated(Cell<C> cell, (C)=>ImageResource iconFunc) {
    new VariableIconCellDecorator(cell, iconFunc)
  }

  public static def <C> Cell<C> draggable(Cell<C> cell, (C,DataTransfer)=>void dtFunc) {
    new DraggableCell(cell, dtFunc)
  }
}

class Columns {
  public static def <T> TextColumn<T> text((T)=>String valueFunc) {
    new TextColumn<T> {
      override String getValue(T t) {
        valueFunc.apply(t)
      }
    }
  }
}
