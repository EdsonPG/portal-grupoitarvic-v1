/**
 * ============================================================================
 * ARVIC MODULE ACRONYM UTILITIES
 * Utilidades para convertir nombres de módulos a siglas/acrónimos
 * ============================================================================
 */

/**
 * Convierte un nombre de módulo a siglas tomando las iniciales de cada palabra
 * Ejemplo: "Soporte a Cuentas de Usuario" → "SCU"
 * 
 * @param {string} moduleName - Nombre completo del módulo
 * @returns {string} - Siglas del módulo en mayúsculas
 */
function convertModuleToAcronym(moduleName) {
    // Si el módulo es vacío, null o undefined, retornar N/A
    if (!moduleName || moduleName === 'N/A') {
        return 'N/A';
    }
    
    // Palabras comunes que se deben ignorar al crear siglas
    const wordsToIgnore = [
        'a', 'de', 'del', 'la', 'el', 'los', 'las',
        'y', 'o', 'u', 'en', 'con', 'sin', 'por',
        'para', 'al', 'un', 'una'
    ];
    
    // Dividir el nombre en palabras
    const words = moduleName
        .trim()
        .split(/\s+/) // Separar por espacios
        .filter(word => word.length > 0); // Eliminar espacios vacíos
    
    // Crear siglas tomando la primera letra de cada palabra significativa
    const acronym = words
        .filter(word => {
            // Ignorar palabras comunes (artículos, preposiciones, etc.)
            return !wordsToIgnore.includes(word.toLowerCase());
        })
        .map(word => {
            // Limpiar caracteres no alfanuméricos (paréntesis, puntos, etc.)
            const cleaned = word.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '');
            return cleaned.charAt(0).toUpperCase();
        })
        .filter(char => char.length > 0)
        .join('');
    
    // Si después de filtrar no quedaron letras, usar la primera letra del nombre original
    if (acronym.length === 0) {
        return moduleName.charAt(0).toUpperCase();
    }
    
    return acronym;
}

/**
 * Función auxiliar para aplicar conversión a siglas en datos de reportes
 * Esta función se puede usar para procesar arrays de datos antes de exportar
 * 
 * @param {Array} data - Array de objetos con datos del reporte
 * @param {string} moduleField - Nombre del campo que contiene el módulo (por defecto 'modulo')
 * @returns {Array} - Array con los módulos convertidos a siglas
 */
function applyAcronymsToData(data, moduleField = 'modulo') {
    return data.map(row => {
        if (row[moduleField]) {
            return {
                ...row,
                [moduleField]: convertModuleToAcronym(row[moduleField])
            };
        }
        return row;
    });
}

// Exportar funciones globalmente para uso en todo el sistema
window.convertModuleToAcronym = convertModuleToAcronym;
window.applyAcronymsToData = applyAcronymsToData;

console.log('✅ ARVIC Module Acronym Utilities cargadas exitosamente');

// Ejemplos de uso (para debug):
/*
console.log(convertModuleToAcronym("Soporte a Cuentas de Usuario")); // → "SCU"
console.log(convertModuleToAcronym("Gestión de Base de Datos")); // → "GBD"
console.log(convertModuleToAcronym("Control y Monitoreo")); // → "CM"
console.log(convertModuleToAcronym("Sistema Integral")); // → "SI"
*/