/**
 * Devuelve los meses (mes/año) que un inquilino debe desde su ocupación hasta el mes actual.
 * Solo considera los meses a partir de la fecha de ocupación.
 * @param {string} inquilinoId
 * @param {string} inmuebleId
 * @param {Date} fechaOcupacion
 * @returns {Promise<Array<{mes: string, anio: number, montoTotal: number, serviciosPendientes: boolean}>>}
 */
export async function obtenerMesesAdeudadosHistorico(inquilinoId, inmuebleId, fechaOcupacion) {
    try {
        const mesesNombres = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const hoy = new Date();
        
        // Validar fecha de ocupación
        if (!fechaOcupacion || isNaN(fechaOcupacion.getTime())) {
            console.error("Fecha de ocupación inválida:", fechaOcupacion);
            return [];
        }

        // Obtener información del inquilino para verificar servicios
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
        const inquilinoData = inquilinoDoc.exists() ? inquilinoDoc.data() : null;
        const tieneServicios = inquilinoData && inquilinoData.pagaServicios && 
            ((inquilinoData.servicios && Array.isArray(inquilinoData.servicios) && inquilinoData.servicios.length > 0) || 
            (inquilinoData.tipoServicio && inquilinoData.montoServicio));

        // Obtener el inmueble para conocer el monto de renta
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", inmuebleId));
        const montoRenta = inmuebleDoc.exists() ? (inmuebleDoc.data().rentaMensual || 0) : 0;

        // Trae todos los pagos del inquilino/inmueble una sola vez
        const pagosQuery = query(
            collection(db, "pagos"),
            where("inquilinoId", "==", inquilinoId),
            where("inmuebleId", "==", inmuebleId)
        );
        const pagosSnap = await getDocs(pagosQuery);
        const pagosList = [];
        pagosSnap.forEach(doc => {
            pagosList.push({...doc.data(), id: doc.id});
        });

        // Mes y año de ocupación
        const mesOcupacion = fechaOcupacion.getMonth();
        const anioOcupacion = fechaOcupacion.getFullYear();
        
        // Mes y año actual
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();
        
        let mesesPendientes = [];
        
        // Iterar desde el mes de ocupación hasta el mes actual
        for (let anio = anioOcupacion; anio <= anioActual; anio++) {
            // Determinar mes inicial y final para este año
            const mesInicial = (anio === anioOcupacion) ? mesOcupacion : 0;
            const mesFinal = (anio === anioActual) ? mesActual : 11;
            
            for (let mes = mesInicial; mes <= mesFinal; mes++) {
                const nombreMes = mesesNombres[mes];
                
                // Buscar pagos para este mes/año
                const pagosMes = pagosList.filter(p => 
                    p.mesCorrespondiente && 
                    p.anioCorrespondiente &&
                    p.mesCorrespondiente.toString().trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') === nombreMes.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') &&
                    Number(p.anioCorrespondiente) === anio
                );
                
                // Verificar si hay algún pago con estado "pagado"
                let pagado = false;
                let serviciosPagados = false;
                
                pagosMes.forEach(pago => {
                    if (typeof pago.estado === "string" && pago.estado.trim().toLowerCase() === "pagado") {
                        pagado = true;
                    }
                    
                    // Verificar si los servicios están pagados
                    if (tieneServicios && pago.serviciosPagados) {
                        const tieneServiciosPagados = pago.serviciosPagados.internet || 
                                                    pago.serviciosPagados.agua || 
                                                    pago.serviciosPagados.luz;
                        if (tieneServiciosPagados) {
                            serviciosPagados = true;
                        }
                    }
                });
                
                // Si no está pagado, agregar a la lista de meses pendientes
                if (!pagado) {
                    mesesPendientes.push({
                        mes: nombreMes,
                        anio: anio,
                        montoTotal: montoRenta,
                        serviciosPendientes: tieneServicios && !serviciosPagados
                    });
                }
            }
        }
        
        return mesesPendientes;
    } catch (error) {
        console.error("Error en obtenerMesesAdeudadosHistorico:", error);
        return [];
    }
}