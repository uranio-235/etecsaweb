// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your Javascript code.


/* TODO

 - una colección para almacenar la búsquedas realizadas
   si ya hubo una búsqueda, entonces sacamos sus valores

*/

// al cargar
$(document).ready(() => {

    // si no hay indexDB, ni sigas
    if (!window.indexedDB) errorTotal('su navegador no soporta indexDB, así de viejo debe ser')

    // si la api no está lista, deshabilita todo
    // el error puede ser desconocido o conocido
    // la api informa los errores conocidos en {status: "descripción del error"}
    $.ajax({
        url: '/api/ready',
        success: json => { if (!json.ready) errorTotal(json.status) },
        error: () => { errorTotal('se desconoce la causa, vea la salida de docker') }
    });

    // abre la base de datos
    document.db = new Dexie('etecsa');

    // crea la tabla móviles e indísala por number
    document.db.version(1).stores({ movil: 'number, name' });

    // crea la tabla search (búsquedas realizadas) e indísala por clave
    document.db.version(1).stores({ search: 'clave' });

    // arranca datables y ponlo en español
    $("#latabla").DataTable({
        language: {
            "decimal": "",
            "emptyTable": "No hay información",
            "info": "Mostrando _START_ a _END_ de _TOTAL_ Entradas",
            "infoEmpty": "sin resultados para mostrar",
            "infoFiltered": "(Filtrado de _MAX_ total entradas)",
            "infoPostFix": "",
            "thousands": "'",
            "lengthMenu": "Mostrar _MENU_ Entradas",
            "loadingRecords": "Cargando...",
            "processing": "Procesando...",
            "search": "filtrar resultados",
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

    // el filtro de datos
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


// indica un estado en la «barra de estado»
function estado(que) { $("#estado").text(que) };


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
            if (c == ' ') return c
            if (!isNaN(parseInt(c))) return c
        }).join('') // que
    );

    // verifica si el primer carácter es una letra o un número
    // en tales casos llama a sus respectivas funciones
    if (isNaN(parseInt($('#inputSearch').val()[0])))
        buscarLetras()
    else
        buscarNumero()

} // inputOnKeyUp


// llama al ajax que busca en la base de datos por nombre
async function buscarLetras() {

    // toma solamente letras
    let cadena = $("#inputSearch").val().split('').map(c => { if (isNaN(parseInt(c))) { return c.toLowerCase() } }).join('')

    // mételo de regreso al input
    $("#inputSearch").val(cadena);

    // si no tiene espacio, ni sigas, solo buscamos «nombre apellido»
    if (!cadena.includes(' ')) return;

    //el nombre y apellido deben tener una longitud decente antes de matarnos buscándolo
    if (cadena.split(' ')[0].length < 3) return;
    if (cadena.split(' ')[1].length < 3) return;

    // si lo que está buscando ya se ha buscado, ni sigas, seguro está en caché
    if ( await document.db.search.filter(f => f.clave == cadena).count() > 0 ) {

        // recarga la tabla
        recargarTabla(cadena);

        // terminó
        estado("operación completada");

        // y termina
        return;
    }
    else // si es nuevo, cachéalo
    {
        // añádelo a la tabla de resultados buscados
        document.db.search.add({ clave: cadena });

    } // if 

    // indícame que estoy buscando en la caché
    estado(`buscando «${cadena}» en caché`);

    // quizás ya el indexedDB tiene algo parecido a lo que se busca
    recargarTabla(cadena);

    // expresa el cambio de estado, antes de ejecutar el ajax
    $("#estado").text(`buscando «${cadena}» como móvil...`);

    // consulta anidada, primero móvil, luego fijo
    $.get(`/api/movil/${cadena}`, moviles => {

        // mete los móviles en el indexeddb y recarga la tabla
        recargarTabla(cadena, moviles);

        // ahora vamos a buscar fijos
        $("#estado").text(`buscando «${cadena}» como fijo`);

        // cuando el ajax de los móviles halla terminado, mándalo a buscar fijos
        $.get(`/api/fijo/${cadena}`, fijos => {

            // los fijos pal saco y pa la tabla
            recargarTabla(cadena, fijos);

            // si lo que se buscó es igual a lo que está
            // en el input entonces ya terminó la operación
            if (cadena == $("#inputSearch").val())
                estado('operación completada')

        }) // $.get

    }) // $.get

} // buscarLetras


// efectua la consulta en localstorage y refresca la tabla colocando los resultados
// si recibe el argumento «moviles» entonces lo añade al localstorage
function recargarTabla(clave, moviles) {

    // cache los móviles dados en el indexedDB, si te dieron
    if (moviles && moviles.length > 0)
        moviles.forEach(m => document.db.movil.add(m));

    // espera por los datos en los móviles
    document.db.movil.orderBy('name')

        // buscamos en la colección de móviles, NO la clave, si no
        // lo que está escrito en el input, pues la clave varía según
        // se procesan las peticiones del ajax, Lo que está en el input,
        // siempre será lo que el usuario quiere, sin importar lo que
        // esté saliendo por el suesivo ajax
        .filter(f => f.name
            .includes(
                $("#inputSearch")
                    .val()
                    .toUpperCase()
            )
        ).toArray()

        // cuando hallan cargado los móviles
        .then(moviles => {

            // recarga los datos en la tabla
            $("#latabla").DataTable()
                .clear()
                .rows.add(moviles.map(m => ([m.number, m.name, m.address])))
                .draw()

            // oculta el panel y muestra la tabla
            if ($("#latabla").DataTable().rows().count() > 0) {
                $("#contenedorPanel").fadeOut();
                $("#contenedorTabla").fadeIn();
            }

        }) // then

    // pon el evento click en cada fila para mostrar el modal con los detalles
    $('#latabla tbody').on('click', 'tr', function () {

        // invoca la función "showDetail" para es número de teléfono en la fila
        mostrarModal($("#latabla").DataTable().row(this).data()[0]);

    }); // latabla

} // name




// la función que se ocupa de llenar el modal y mostrarlo
// esto sucede cuando el usuario hace click en una fila de la tabla
function mostrarModal(numero) {

    // localiza en la caché el número clicado y añade
    // esos datos a  los < li > al < ul > que muestra los detalles
    document.db.movil.get(numero).then(movil => {

        (["number", "name", "identification", "address"])
            .forEach(que => { $(`#modal-${que}`).text(movil[que]) })

    }) // $.get

    // de momento, muestra el modal
    $(".modal").modal("show")

} // showDetail



// TODO unificar esta función con la otra
// FIXME llevar al sistema de caché
// función que hace la petición ajax para buscar por número
function buscarNumero() {

    // quita las letras del input, déjame solo los números
    $("#inputSearch").val($("#inputSearch").val().split('').map(c => isNaN(parseInt(c)) ? '' : c).join(''))

    // lo que el usuario escribió en el input
    let numero = $("#inputSearch").val();

    //manda a buscar el número
    $.ajax({

        // pregúntale a la api por el número buscado
        url: `/api/query/${numero}`,

        // si aparece
        success: movil => {

            // si apareció un número
            if (movil) {

                // dáselo a la caché
                document.db.movil.add(movil);

                // oculta la tabla (si es que está mostrada)
                $("#contenedorTabla").fadeOut();

                // esto será lo que pondremos en la card
                let dato = {
                    "Número": movil.number,
                    "Nombre": movil.name,
                    "Carnet": movil.identification,
                    "Dirección": movil.address
                }

                // los fijos llevan provincia
                if (!movil.provincia.includes('('))
                    dato['Provincia'] = movil.provincia

                // mételo en el UL, usa las {claves: valor} de «dato» para formar el texto
                $("#presentarDatos ul").html(Object.keys(dato).map(k => `<li class="list-group-item"><b>${k}:</b> ${dato[k]}</li>`).join(''))

                // cambia el estado
                $("#estado").text("escriba otro teléfono o carnet")

                // muestra la tarjetica
                $("#contenedorPanel").fadeIn();

            }
            else // si no devolvió algo
            {
                // y lo que buscó parece un número decente
                if (numero.length > 6)
                    $("#estado").text(`el número «${numero}» no está registrado aquí 🙄`);

            } // if

        }, // sucess

    }) // ajax

} // buscarNumero
