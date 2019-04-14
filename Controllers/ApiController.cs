using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860
namespace EtecsaWeb
{

   [Route(@"api/")]
   [Produces(@"application/json")]
   public class ApiController : Controller
   {
      /// <summary>
      /// Entity Frame que representa una instancia de la base de datos de etecsa.
      /// </summary>
      public Models.EtecsaContext etecsa { get; set; }


      // inicializa la base de datos con la ruta configurada en el appsettings.json
      // el constructor de la clase tiene un IConfiguration que contiene los datos esos
      // esto podría ser confuso, si no se tiene en cuenta que es una «arrow function»
      public ApiController(IConfiguration appsetings) =>
         etecsa = new Models.EtecsaContext() { Fichero = appsetings["RutaAlFichero"] };


      // indica si la base de datos está lista
      [HttpGet("ready")]
      public ActionResult SlashReady()
      {
         try // intenta hacer una consulta en la base de datos
         {
            // contando los registros de la vabla Version
            // dará palo si no está lista la conexión
            etecsa.Version.Count();

            // si se cogió, tira en un json que versión tiene la base de datos
            return Json(new { ready = true, status = etecsa.Version.First().Version.ToString() });
         }
         catch (System.Exception e)
         {
            // server not ready? dile que no y loguea el error
            return Json(new { ready = false, status = e.Message });
         }

      } // IsReady


      // cuenta los móviles y fijos en la base de datos
      [HttpGet("statics")]
      public ActionResult SlashStatics() => Json(new { moviles = etecsa.Movil.Count(), fijos = etecsa.Fix.Count() });


      // busca el movil o fijo por su nombre
      [HttpGet("movil/{cadena}")]
      public ActionResult<Models.Movil[]> SlashMovil(string cadena)
      {
         // por si las moscas
         if (cadena.Length < 5 || cadena.IndexOf(" ") < 0) return StatusCode(503);

         // busca los móviles
         return (
            from m in etecsa.Movil
            where m.Name.Contains(cadena.ToUpper())
            select m
            ).ToArray();

      } // SlashMovil


      // lo mismo que lo anterior, pero con los fijos
      [HttpGet("fijo/{cadena}")]
      public ActionResult<Models.Movil[]> SlashFijo(string cadena)
      {
         if (cadena.Length < 5 || cadena.IndexOf(' ') < 0) return StatusCode(503);
         return (
            from f in etecsa.Fix
            where f.Name.Contains(cadena.ToUpper())
            select f.ToMovil() // siempre los fijos se devuelven como móviles
            ).ToArray();

      } // SlashFijo


      // busca un movil o fijo por su número telefónico o carnet
      [HttpGet("query/{numero}")]
      public ActionResult<Models.Movil> SlashQuery(string numero)
      {
         // los carnet tiene 11 dígitos
         if (numero.Length == 11)

            // busca y retorna el móvil por carnet
            return etecsa.Movil.FirstOrDefault(m => m.Identification == numero);

         // luego si es un móvil (empieza por 5)
         else if (numero[0] == '5')
         {
            // busca dicho número
            return etecsa.Movil.FirstOrDefault(m => m.Number == numero);
         }
         else // definitivamente es un fijo
         {
            // búscalo como fijo
            return etecsa.Fix.FirstOrDefault(m => m.Number == numero).ToMovil();

         } // if

      } // Consulta


   } // class
} // namespace
