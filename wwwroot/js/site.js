// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your Javascript code.


// al cargar
$(document).ready(() => {

    // semáforo que indica si faltan datos por cargar
    document.cargando = false;

    // aquí meteremos los números de los móviles que ya bajaron
    // FIXME poco eficiente, consume mucha ram... bueeeeeno
    document.TelefonosEnTabla = [];

    // cada consulta que se realiza la cachamos aquí para no repetirla
    document.TelefonosConsultados = [];

    // si la api no está lista, deshabilita todo
    // el error puede ser desconocido o conocico
    // la api informa los errores conocidos en {status: "descripción del error"}
    $.ajax({
        url: '/api/ready',
        success: json => { if (!json.ready) errorTotal(json.status) },
        error: () => { errorTotal('se desconoce la causa, vea la salida de docker') }
    });

    // arranca datables y ponlo en español
    $("#latabla").DataTable({
        language: {
            "decimal": "",
            "emptyTable": "No hay información",
            "info": "Mostrando _START_ a _END_ de _TOTAL_ Entradas",
            "infoEmpty": "Mostrando 0 to 0 of 0 Entradas",
            "infoFiltered": "(Filtrado de _MAX_ total entradas)",
            "infoPostFix": "",
            "thousands": ",",
            "lengthMenu": "Mostrar _MENU_ Entradas",
            "loadingRecords": "Cargando...",
            "processing": "Procesando...",
            "search": "Filtrar estos resultados",
            "zeroRecords": "Sin resultados encontrados",
            "paginate": {
                "first": "Primero",
                "last": "Ultimo",
                "next": "Siguiente",
                "previous": "Anterior"
            }
        },
        order: [[1, "asc"]]
    });

    // ponle form-control al input de datatables
    $('#latabla_filter input').addClass('shadow-md form-control');

}) // document ready



// deshabilita la app y loguea un error
function errorTotal(cual) {

    // desaste del input
    $("#inputSearch").fadeOut();

    // quita el nav, pa que no se meta en «Acerca de» y falle la base de datos
    $(".navbar").fadeOut();

    // cámbiale el cartelito y aclárale el error
    $("#estado").html(`<p>Error conectando la base datos</p><p>${cual}</p>`)

}  // errorTotal


// función que se lanza cada vez que el usuario levanta el dedo de la tecla en el input
// decide que se hará si buscar números, buscar cadenas o nada
function inputSearchKeyup() {

    // que hay escrito?
    var que = $("#inputSearch").val()

    // poco texto o nada, pues voy bajando
    if (!que || que.length == 0) {
        $("#estado").text('');
        return;
    } else if (que.length < 3) {
        $("#estado").text('por favor escriba más');
        return;
    }

    // solo tomamos espacios, letras y números, como le gusta a etecsa
    $('#inputSearch').val(que
        .replace('á', 'a')
        .replace('é', 'e')
        .replace('í', 'i')
        .replace('ó', 'o')
        .replace('ú', 'u')
        .replace('ü', 'u')
        .split('').filter(c => {
            if ('abcdefghijklmnopqrstuvwxyz'.split('').includes(c)) return c
            if (c==' ') return c
            if (!isNaN(parseInt(c))) return c
        }).join('') // que
    );

    // retoma nuevo resultado, ya modificado por la limpieza anterior
    var limpio = $('#inputSearch').val();

    // si la consulta ya está hecho, termina aquí
    if (document.TelefonosConsultados.includes(limpio)) return

    // cachéa esta consulta
    document.TelefonosConsultados.push(limpio)

    // verifica si el primer caracter es una letra o un número
    // en tales casos llama a sus respectivas funciones
    if (isNaN(parseInt(limpio[0])))
        buscarLetras()
    else
        buscarNumero()

} // inputOnKeyUp



// llama al ajax que busca en la base de datos por nombre
function buscarLetras() {

    // toma lo que está escrito en el input, quítale los números y ponlo minúscula
    var clave = $("#inputSearch").val().split('').map(c => { if (isNaN(parseInt(c))) { return c.toLowerCase() } }).join('')

    // mételo de regreso al input
    $("#inputSearch").val(clave);

    // si no tiene espacio, ni sigas, solo buscamos «nombre apellido»
    if (clave.indexOf(' ') < 0) return;

    //el nombre y apellido deben tener una longitud decente antes de matarnos buscándolo
    if (clave.split(' ')[0].length < 3) return;
    if (clave.split(' ')[1].length < 3) return;

    // expresa el cambio de estado, antes de ejecutar el ajax
    $("#estado").text(`buscar «${clave}» como móvil`);

    // consulta anidada, primero móvil, luego fijo
    $.get(`/api/movil/${clave}`, moviles => {

        // mételo en la tabla
        ponerEnTabla(moviles)

        // ahora vamos a buscar fijos
        $("#estado").text(`buscar «${clave}» como fijo`);

        // cuando el ajax de los móviles halla terminado, mándalo a buscar fijos
        $.get(`/api/fijo/${clave}`, fijos => ponerEnTabla(fijos) )

    }) // $.get

} // buscarLetras



// mete los números dados en la tabla y la muestra
function ponerEnTabla(moviles) {

    // se espera que halla al menos un resultado
    if (!moviles || moviles.length == 0) return;

    // oculta el panel (si es que está visible)
    $("#contenedorPanel").fadeOut();

    // méte todos lo móviles de uno en fondo pa la tabla
    moviles.forEach(movil => {

        // verifica si el número no está ya en la tabla
        if (document.TelefonosEnTabla.includes(movil.number)) {

            // si ya está en la tabla, terminamos aquí
            return
        }
        else // si no está puesto en la tabla
        {
            // márcalo como bajado
            document.TelefonosEnTabla.push(movil.number);
        }

        // toma la tabla como objeto de datatable
        var tabla = $("#latabla").DataTable();

        // añade la fila a la tabla
        // sucesivamente, el número, el nombre y la dirección
        tabla.row.add([movil.number, movil.name, movil.address]).draw()

        // muestra la tabla
        $("#contenedorTabla").fadeIn();

        // pon el evento click en cada fila
        $('#latabla tbody').on('click', 'tr', function () {

            // toma el número de teléfono que tiene la fila
            var numero = tabla.row(this).data()[0];

            // invoca la función "showDetail"
            showDetail(numero);

        }); // latabla

    }); // forEach

    // pon la primera palabra en el filtro
    $('#latabla_filter input').val($('#inputSearch').val());

    // y dime que ya terminó
    $("#estado").text(`operación completada, ${document.TelefonosEnTabla.length+1} resultados`);

} // ponerEnTabla



// la función que se ocupa de llenar el modal y mostrarlo
// esto sucede cuando el usuario hace click en una fila de la tabla
function showDetail(numero) {

    // añade los <li> al <ul> que muestra los detalls
    $.get(`/api/query/${numero}`, movil => {

        (["number", "name", "identification", "address"])
            .forEach(que => { $(`#modal-${que}`).text(movil[que]) })

    }) // $.get

    // de momento, muestra el modal
    $(".modal").modal("show")

} // showDetail




// función que hace la petición ajax para buscar por número
function buscarNumero() {

    // quita las letras del input, déjame solo los números
    $("#inputSearch").val($("#inputSearch").val().split('').map(c => isNaN(parseInt(c)) ? '' : c).join(''))

    // lo que el usuario escribió en el input
    var clave = $("#inputSearch").val();

    //manda a buscar el número
    $.ajax({

        // pregúntale a la api por el número buscado
        url: `/api/query/${clave}`,

        // si aparece
        success: movil => {

            // si apareció un número
            if (movil) {

                // ponlo en la tarjetica
                ponerEnPresentacion(movil);

            }
            else // si no devolvió algo
            {
                // dícelo
                if (clave.length > 6)
                    $("#estado").text(`el número «${clave}» no está registrado aquí 🙄`);

            } // if

        }, // sucess

    }) // ajax

} // buscarNumero



// coloca un único número en un panelito de presentación
function ponerEnPresentacion(movil) {

    // oculta la tabla (si es que está mostrada)
    $("#contenedorTabla").fadeOut();

    // esto será lo que pondremos en la card
    var dato = {
        "Numero": movil.number,
        "Nombre": movil.name,
        "Carnet": movil.identification,
        "Dirección": movil.address
    }

    // mételo en el UL, usa las {claves: valor} de «dato» para formar el texto
    $("#presentarDatos ul").html(Object.keys(dato).map(k => `<li class="list-group-item"><b>${k}:</b> ${dato[k]}</li>`).join(''))

    // cambia el estado
    $("#estado").text("escriba otro teléfono o carnet")

    // muestra la tarjetica
    $("#contenedorPanel").fadeIn();

} // ponerEnPresentacion