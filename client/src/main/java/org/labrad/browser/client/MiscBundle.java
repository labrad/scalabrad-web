package org.labrad.browser.client;

import com.google.gwt.resources.client.ClientBundle;
import com.google.gwt.resources.client.CssResource;

public interface MiscBundle extends ClientBundle {
  static interface Css extends CssResource {
    @ClassName("page-menu")
    String pageMenuClass();

    @ClassName("breadcrumbs")
    String breadcrumbsClass();

    @ClassName("label-status")
    String labelStatusClass();

    @ClassName("label-red")
    String labelRedClass();

    @ClassName("label-green")
    String labelGreenClass();

    @ClassName("padded-label")
    String paddedLabelClass();

    @ClassName("centered-cell")
    String centeredCellClass();

    @ClassName("padded-cell")
    String paddedCellClass();

    @ClassName("server-group")
    String serverGroupClass();

    @ClassName("server-name")
    String serverNameClass();

    @ClassName("odd-row")
    String oddRowClass();

    @ClassName("version-conflict")
    String versionConflictClass();

    @ClassName("highlight")
    String highlightClass();
  }

  @Source("MiscStyle.css")
  @CssResource.NotStrict
  Css css();
}
