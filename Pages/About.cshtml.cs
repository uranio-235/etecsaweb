using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Configuration;

namespace EtecsaWeb.Pages
{
   public class AboutModel : PageModel
   {
      // inyecta la configuración
      private readonly IConfiguration Appsettings;
      public AboutModel(IConfiguration conf) => Appsettings = conf;

      // la versión de la aplicación de acorde al appsettings
      public string VersionAplicacion { get; set; }

      // la ruta a la base de datos
      public string RutaAlFichero { get; set; }

      // estilo clásico
      public void OnGet()
      {
        // la versión de la aplicación está en el appsettings
        VersionAplicacion = Appsettings["VersionAplicacion"];

        // el fichero que se cargó
        RutaAlFichero = Appsettings["RutaAlFichero"];

      } // OnGet

   } // class
} // namespace
