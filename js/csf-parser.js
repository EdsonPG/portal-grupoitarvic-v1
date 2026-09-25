/**
 * === CSF PARSER (CONSTANCIA DE SITUACIÓN FISCAL SAT) ===
 * Extrae RFC, Razón Social, Régimen Fiscal y Código Postal desde archivos PDF de la CSF
 */

window.CSFParser = {
    /**
     * Extrae texto y campos fiscales de un archivo PDF de la CSF
     * @param {File} file - Objeto File del input
     * @returns {Promise<Object>} Datos fiscales extraídos
     */
    async parseFile(file) {
        if (!file) throw new Error('No se proporcionó ningún archivo');

        // Leer como ArrayBuffer y Base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = await window.CSFParser.fileToBase64(file);

        let extractedText = '';

        // Intentar extraer texto usando PDF.js si está cargado o cargarlo dinámicamente
        try {
            await window.CSFParser.loadPdfJsIfNeeded();
            if (window.pdfjsLib) {
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                const maxPages = Math.min(pdf.numPages, 3);

                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += ' ' + pageText;
                }
                extractedText = fullText;
            }
        } catch (pdfErr) {
            console.warn('Extracción local con PDF.js falló o no disponible, usando backend:', pdfErr);
        }

        // Consultar el backend con el texto o base64
        const API_URL = window.PortalDB?.API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('arvic_token');

        const response = await fetch(`${API_URL}/expedientes/parse-csf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                text: extractedText,
                base64: base64.split(',')[1] || base64
            })
        });

        const result = await response.json();

        if (result.success && result.data) {
            return {
                ...result.data,
                fileName: file.name,
                fileSize: file.size,
                fileData: base64,
                mimeType: file.type || 'application/pdf'
            };
        }

        // Si falló el backend, intentar parseo local con regex de fallback
        return window.CSFParser.parseTextLocally(extractedText, file, base64);
    },

    parseTextLocally(text, file, base64) {
        const content = String(text || '');

        // 1. RFC
        const rfcMatch = content.match(/RFC\s*:?\s*([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})/i) || content.match(/\b([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})\b/i);
        const rfc = rfcMatch ? rfcMatch[1].toUpperCase() : '';

        // 2. Nombre / Razón Social (Personas Físicas vs Morales)
        let razonSocial = '';
        const nombreMatch = content.match(/Nombre\s*\(\s*s\s*\)\s*:?\s*([A-ZÀ-ÿ\s]+?)(?=(?:Primer\s*Apellido|CURP|RFC|Fecha|\r?\n|$))/i);
        const ap1Match = content.match(/Primer\s*Apellido\s*:?\s*([A-ZÀ-ÿ\s]+?)(?=(?:Segundo\s*Apellido|Fecha|Estatus|\r?\n|$))/i);
        const ap2Match = content.match(/Segundo\s*Apellido\s*:?\s*([A-ZÀ-ÿ\s]+?)(?=(?:Fecha|Estatus|CURP|\r?\n|$))/i);

        if (nombreMatch && ap1Match) {
            const nom = nombreMatch[1].trim();
            const ap1 = ap1Match[1].trim();
            const ap2 = ap2Match ? ap2Match[1].trim() : '';
            razonSocial = `${nom} ${ap1} ${ap2}`.replace(/\s+/g, ' ').trim();
        } else {
            const moralMatch = content.match(/(?:Denominaci[óo]n\s*\/\s*Raz[óo]n\s*Social|Denominaci[óo]n\s*o\s*Raz[óo]n\s*Social|Raz[óo]n\s*Social)\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:R[ée]gimen|Capital|Fecha|Estatus|IdCIF|\r?\n|$))/i);
            if (moralMatch && !moralMatch[1].toLowerCase().includes('idcif')) {
                razonSocial = moralMatch[1].trim().replace(/\s+/g, ' ');
            }
        }

        // 3. Código Postal
        const cpMatch = content.match(/(?:C[óo]digo\s*Postal|C\.?P\.?)\s*:?\s*(\d{5})/i) || content.match(/\b(\d{5})\b/);
        const codigoPostal = cpMatch ? cpMatch[1] : '';

        // 4. Régimen Fiscal
        let regimenFiscal = '';
        const satRegimes = [
            'Régimen de las Personas Físicas con Actividades Empresariales y Profesionales',
            'Personas Físicas con Actividades Empresariales y Profesionales',
            'Régimen Simplificado de Confianza',
            'Régimen de Sueldos y Salarios e Ingresos Asimilados a Salarios',
            'Sueldos y Salarios e Ingresos Asimilados a Salarios',
            'Régimen de Arrendamiento',
            'Régimen de Incorporación Fiscal',
            'Régimen General de Ley Personas Morales',
            'Personas Morales con Fines no Lucrativos',
            'Régimen de Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
            'Régimen de los ingresos por Dividendos',
            'Régimen de los ingresos por intereses',
            'Régimen de los ingresos por obtención de premios'
        ];

        for (const reg of satRegimes) {
            if (new RegExp(reg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(content)) {
                regimenFiscal = reg;
                break;
            }
        }

        if (!regimenFiscal) {
            const regSection = content.match(/(?:Reg[íi]menes\s*:?|R[ée]gimen\s*:?)(?:[\s\S]*?)(?:Fecha\s*Inicio\s*Fecha\s*Fin\s*)?([A-ZÀ-ÿ0-9\s\-–,.]+?)(?:\s+\d{2}\/\d{2}\/\d{4}|\r?\n|$)/i);
            if (regSection) {
                let candidate = regSection[1].replace(/Fecha\s*Inicio|Fecha\s*Fin/gi, '').trim();
                candidate = candidate.replace(/\s+/g, ' ');
                if (candidate.length > 5 && candidate.length < 100) {
                    regimenFiscal = candidate;
                }
            }
        }

        // 5. Vialidad / Calle
        let calleFiscal = '';
        const calleMatch = content.match(/Nombre\s*de\s*(?:la\s*)?Vialidad\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:N[úu]mero|Tipo|Entre|Y\s*Calle|\r?\n|$))/i) ||
                           content.match(/(?:Calle|Vialidad)\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]{2,80}?)(?=(?:N[úu]mero|Num|\r?\n|$))/i);
        if (calleMatch) {
            calleFiscal = calleMatch[1].trim().replace(/\s+/g, ' ');
        }

        // 6. Número Exterior
        let numExtFiscal = '';
        const numExtMatch = content.match(/N[úu]mero\s*(?:y\/o\s*letra\s*)?Exterior\s*:?\s*([A-Z0-9\s\-/]+?)(?=(?:N[úu]mero\s*Interior|Nombre|Entre|\r?\n|$))/i) ||
                            content.match(/(?:Num\.?\s*Ext\.?|No\.\s*Ext\.?)\s*:?\s*([A-Z0-9\s\-/]{1,20}?)(?:\r?\n|$)/i);
        if (numExtMatch) numExtFiscal = numExtMatch[1].trim();

        // 7. Número Interior
        let numIntFiscal = '';
        const numIntMatch = content.match(/N[úu]mero\s*(?:y\/o\s*letra\s*)?Interior\s*:?\s*([A-Z0-9\s\-/]+?)(?=(?:Nombre\s*de\s*la\s*Colonia|Nombre|Entre|\r?\n|$))/i) ||
                            content.match(/(?:Num\.?\s*Int\.?|No\.\s*Int\.?)\s*:?\s*([A-Z0-9\s\-/]{1,20}?)(?:\r?\n|$)/i);
        if (numIntMatch && !numIntMatch[1].toLowerCase().includes('nombre')) {
            numIntFiscal = numIntMatch[1].trim();
        }

        // 8. Colonia
        let coloniaFiscal = '';
        const colMatch = content.match(/Nombre\s*de\s*la\s*Colonia\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:Nombre\s*de\s*la\s*Localidad|Nombre\s*del\s*Municipio|Entre|\r?\n|$))/i) ||
                         content.match(/Colonia\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]{2,80}?)(?=(?:Municipio|Localidad|\r?\n|$))/i);
        if (colMatch) coloniaFiscal = colMatch[1].trim().replace(/\s+/g, ' ');

        // 9. Municipio / Alcaldía
        let municipioFiscal = '';
        const munMatch = content.match(/Nombre\s*del\s*Municipio\s*o\s*Demarcaci[óo]n\s*Territorial\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:Nombre\s*de\s*la\s*Entidad|Nombre|Entre|\r?\n|$))/i) ||
                         content.match(/(?:Municipio|Alcald[íi]a)\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]{2,80}?)(?=(?:Entidad|Estado|\r?\n|$))/i);
        if (munMatch) municipioFiscal = munMatch[1].trim().replace(/\s+/g, ' ');

        // 10. Estado / Entidad Federativa
        let estadoFiscal = '';
        const edoMatch = content.match(/Nombre\s*de\s*la\s*Entidad\s*Federativa\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:Entre|Y\s*Calle|Reg[íi]menes|\r?\n|$))/i) ||
                         content.match(/(?:Entidad\s*Federativa|Estado)\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]{2,80}?)(?=(?:Entre|Y\s*Calle|\r?\n|$))/i);
        if (edoMatch) estadoFiscal = edoMatch[1].trim().replace(/\s+/g, ' ');

        return {
            rfc,
            razonSocial,
            regimenFiscal,
            codigoPostalFiscal: codigoPostal,
            calleFiscal,
            numExtFiscal,
            numIntFiscal,
            coloniaFiscal,
            municipioFiscal,
            estadoFiscal,
            fileName: file.name,
            fileSize: file.size,
            fileData: base64,
            mimeType: file.type || 'application/pdf'
        };
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    async loadPdfJsIfNeeded() {
        if (window.pdfjsLib) return;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                resolve();
            };
            script.onerror = () => resolve(); // no bloquear si falla el CDN
            document.head.appendChild(script);
        });
    }
};
