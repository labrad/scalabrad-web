package org.labrad.browser.client.ui

import com.google.gwt.safehtml.client.SafeHtmlTemplates
import com.google.gwt.safehtml.shared.SafeHtml
import com.google.gwt.cell.client.Cell
import java.util.Set
import java.util.HashSet
import com.google.gwt.dom.client.BrowserEvents
import com.google.gwt.dom.client.Element
import com.google.gwt.dom.client.NativeEvent
import com.google.gwt.cell.client.ValueUpdater
import com.google.gwt.safehtml.shared.SafeHtmlBuilder
import com.google.gwt.core.client.GWT
import com.google.gwt.dom.client.DataTransfer

public class DraggableCell<C> implements Cell<C> {

  static interface Template extends SafeHtmlTemplates {
    @Template('<div draggable="true">{0}</div>')
    def SafeHtml wrapper(SafeHtml cellContents)
  }

  private static val template = GWT::create(Template) as Template

  private val Cell<C> cell
  private var (C,DataTransfer)=>void handler

  new(Cell<C> cell, (C,DataTransfer)=>void handler) {
    this.cell = cell
    this.handler = handler
  }

  override def boolean dependsOnSelection() {
    cell.dependsOnSelection()
  }

  override def Set<String> getConsumedEvents() {
    val cellEvents = cell.consumedEvents
    val events = if (cellEvents == null) {
      new HashSet<String>
    } else {
      new HashSet<String>(cell.consumedEvents)
    }
    events.add(BrowserEvents::DRAGSTART)
    events
  }

  override def boolean handlesSelection() {
    cell.handlesSelection()
  }

  override def boolean isEditing(Context context, Element parent, C value) {
    cell.isEditing(context, getCellParent(parent), value)
  }

  override def void onBrowserEvent(Context context, Element parent, C value,
      NativeEvent event, ValueUpdater<C> valueUpdater) {
    if (event.type == BrowserEvents::DRAGSTART) {
      if (handler != null) {
        val dt = event.dataTransfer
        handler.apply(value, dt)
      }
    } else {
      cell.onBrowserEvent(context, getCellParent(parent), value, event, valueUpdater)
    }
  }

  override def void render(Context context, C value, SafeHtmlBuilder sb) {
    val cellBuilder = new SafeHtmlBuilder
    cell.render(context, value, cellBuilder)
    sb.append(template.wrapper(cellBuilder.toSafeHtml))
  }

  override def boolean resetFocus(Context context, Element parent, C value) {
    cell.resetFocus(context, getCellParent(parent), value)
  }

  override def void setValue(Context context, Element parent, C value) {
    cell.setValue(context, getCellParent(parent), value)
  }

  /**
   * Get the parent element of the decorated cell.
   *
   * @param parent the parent of this cell
   * @return the decorated cell's parent
   */
  private def Element getCellParent(Element parent) {
    parent.firstChildElement.getChild(0).cast()
  }
}
