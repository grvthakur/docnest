import { createElement } from "../utils/dom.js";

const IMAGE_TYPES = ["jpg", "jpeg", "png", "webp"];

export class ViewerComponent {
  constructor() {
    this.currentDoc = null;
    this.docList = [];
    this.currentIndex = -1;
    this.modal = null;
  }

  open(doc, docList = []) {
    this.currentDoc = doc;
    this.docList = docList;
    this.currentIndex = docList.findIndex((d) => d.id === doc.id);
    this.render();
  }

  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  // Split the document's variants into images (front/back/etc.), the PDF (if
  // any), and anything else (e.g. heic, docx) that needs its own fallback tile.
  categorizeVariants() {
    const variants = this.currentDoc.variants || [];
    const images = [];
    let pdf = null;
    const others = [];
    for (const v of variants) {
      const type = v.fileType?.toLowerCase();
      if (IMAGE_TYPES.includes(type)) images.push(v);
      else if (type === "pdf" && !pdf) pdf = v;
      else others.push(v);
    }
    return { images, pdf, others, variants };
  }

  render() {
    this.close();
    this.modal = createElement("div", {
      className: "modal-overlay",
      onClick: (e) => {
        if (e.target === this.modal) this.close();
      },
    });
    const modal = createElement("div", {
      className: "modal modal-wide",
      onClick: (e) => e.stopPropagation(),
    });

    const { images, pdf, others, variants } = this.categorizeVariants();

    const header = createElement("div", { className: "modal-header" }, [
      createElement("span", {}, [this.currentDoc.name]),
      createElement(
        "button",
        { className: "btn btn-outline", onClick: () => this.close() },
        ["✕"],
      ),
    ]);

    const body = createElement("div", { className: "modal-body modal-body-split" });

    if (images.length > 0 && pdf) {
      // Split view: images side-by-side on the left, PDF on the right.
      body.appendChild(this.buildImagesPanel(images));
      body.appendChild(this.buildPdfPanel(pdf));
    } else if (images.length > 0) {
      // No PDF — just show the image(s) side-by-side, full width.
      const panel = this.buildImagesPanel(images);
      panel.classList.add("viewer-panel-full");
      body.appendChild(panel);
    } else if (pdf) {
      const panel = this.buildPdfPanel(pdf);
      panel.classList.add("viewer-panel-full");
      body.appendChild(panel);
    } else if (others.length > 0) {
      body.appendChild(this.buildFallbackPanel(others[0]));
    } else {
      body.appendChild(createElement("p", {}, ["No preview available."]));
    }

    // "Other" variants that aren't shown inline (e.g. HEIC) still get a
    // download tile so nothing is hidden from the user.
    let otherBar = null;
    if (others.length > 0 && (images.length > 0 || pdf)) {
      otherBar = this.buildOthersBar(others);
    }

    const footer = this.buildDownloadFooter(variants);

    if (this.docList.length > 1) {
      modal.appendChild(
        createElement(
          "button",
          { className: "modal-nav prev", onClick: () => this.navigate(-1) },
          ["‹"],
        ),
      );
      modal.appendChild(
        createElement(
          "button",
          { className: "modal-nav next", onClick: () => this.navigate(1) },
          ["›"],
        ),
      );
    }

    modal.appendChild(header);
    modal.appendChild(body);
    if (otherBar) modal.appendChild(otherBar);
    modal.appendChild(footer);
    this.modal.appendChild(modal);
    document.body.appendChild(this.modal);
  }

  buildImagesPanel(images) {
    const panel = createElement("div", { className: "viewer-panel viewer-images-panel" });
    const grid = createElement("div", { className: "viewer-images-grid" });
    for (const variant of images) {
      const tile = createElement("div", { className: "viewer-image-tile" }, [
        createElement("img", { src: variant.filePath, alt: variant.label }),
        createElement("div", { className: "viewer-image-label" }, [variant.label]),
      ]);
      grid.appendChild(tile);
    }
    panel.appendChild(grid);
    return panel;
  }

  buildPdfPanel(pdfVariant) {
    const panel = createElement("div", { className: "viewer-panel viewer-pdf-panel" });
    panel.appendChild(
      createElement("iframe", {
        src: pdfVariant.filePath + "#view=FitH",
        title: pdfVariant.label || "PDF Preview",
      }),
    );
    return panel;
  }

  buildFallbackPanel(variant) {
    const type = variant.fileType?.toLowerCase();
    const message =
      type === "heic"
        ? "HEIC photos can't be previewed in the browser."
        : "Preview not available.";
    return createElement("div", { className: "viewer-panel viewer-panel-full" }, [
      createElement("p", { style: "text-align:center;" }, [
        message + " ",
        createElement(
          "a",
          {
            href: variant.filePath,
            download: this.buildDownloadName(variant),
            className: "btn",
          },
          ["Download"],
        ),
      ]),
    ]);
  }

  buildOthersBar(others) {
    const bar = createElement("div", { className: "viewer-others-bar" }, [
      createElement("span", { className: "viewer-others-label" }, ["Also available:"]),
    ]);
    for (const variant of others) {
      bar.appendChild(
        createElement(
          "a",
          {
            href: variant.filePath,
            download: this.buildDownloadName(variant),
            className: "btn btn-outline",
          },
          [`⬇ ${variant.label}`],
        ),
      );
    }
    return bar;
  }

  // One download link per variant, so front/back/PDF can each be saved
  // individually instead of forcing a single "active" choice.
  buildDownloadFooter(variants) {
    const footer = createElement("div", { className: "modal-footer modal-footer-list" });
    for (const variant of variants) {
      footer.appendChild(
        createElement(
          "a",
          {
            href: variant.filePath,
            download: this.buildDownloadName(variant),
            className: "btn btn-outline",
          },
          [`⬇ ${variant.label}`],
        ),
      );
    }
    return footer;
  }

  buildDownloadName(variant) {
    const parts = variant.filePath.split("/");
    return parts[parts.length - 1];
  }

  navigate(direction) {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.docList.length) {
      this.currentDoc = this.docList[newIndex];
      this.currentIndex = newIndex;
      this.render();
    }
  }
}
